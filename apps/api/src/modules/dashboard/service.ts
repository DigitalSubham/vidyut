import { withTenant } from "@vidyut/db";
import type { DashboardSummaryQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { userHasPermission } from "../../core/guards/require-permission";
import type { RequestAuth } from "../../core/guards/types";
import { invoiceTotal } from "../payments/service";
import { getStaffByUserId } from "../staff/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

async function assertDashboardAccess(auth: RequestAuth): Promise<void> {
  const allowed = (await userHasPermission(auth, "dashboard.owner")) || (await userHasPermission(auth, "dashboard.principal"));
  if (!allowed) {
    throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
  }
}

function monthRange(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function dayRange(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
  };
}

/**
 * A thin aggregator (context/feature-specs/28's Open Question 1) — every
 * number here reuses an existing, already-tested calculation (Unit 12's
 * invoiceTotal, Unit 15's attendance-percent convention, Unit 10's
 * enquiry->application->conversion funnel), not new business logic.
 */
export async function getDashboardSummary(auth: RequestAuth, query: DashboardSummaryQueryInput) {
  await assertDashboardAccess(auth);
  assertBranchAccess(auth, query.branchId);

  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(now);
  const { start: dayStart, end: dayEnd } = dayRange(now);

  return withTenant(auth.tenantId, async (tx) => {
    // Collection % — this month's invoices.
    const monthInvoices = await tx.invoice.findMany({
      where: { branchId: query.branchId, createdAt: { gte: monthStart, lt: monthEnd } },
      include: { items: true, payments: { where: { status: "SUCCESS" } } },
    });
    const totalInvoiced = monthInvoices.reduce((sum, inv) => sum + invoiceTotal(inv.items), 0);
    const totalCollected = monthInvoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((s, p) => s + p.amount, 0),
      0
    );
    const collectionPercent = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 10000) / 100 : 0;

    // Total dues — all non-cancelled invoices, any period.
    const allInvoices = await tx.invoice.findMany({
      where: { branchId: query.branchId, status: { notIn: ["CANCELLED"] } },
      include: { items: true, payments: { where: { status: "SUCCESS" } } },
    });
    const totalDues = allInvoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = invoiceTotal(inv.items) - paid;
      return sum + Math.max(0, outstanding);
    }, 0);

    // Today's attendance %.
    const todayRecords = await tx.attendanceRecord.findMany({
      where: { branchId: query.branchId, date: { gte: dayStart, lt: dayEnd } },
    });
    const presentCount = todayRecords.filter((r) => ["PRESENT", "LATE", "HALF_DAY"].includes(r.status)).length;
    const attendancePercent =
      todayRecords.length > 0 ? Math.round((presentCount / todayRecords.length) * 10000) / 100 : null;

    // This month's admissions funnel.
    const [enquiries, applications, converted] = await Promise.all([
      tx.enquiry.count({ where: { branchId: query.branchId, createdAt: { gte: monthStart, lt: monthEnd } } }),
      tx.application.count({ where: { branchId: query.branchId, createdAt: { gte: monthStart, lt: monthEnd } } }),
      tx.application.count({
        where: {
          branchId: query.branchId,
          createdAt: { gte: monthStart, lt: monthEnd },
          studentId: { not: null },
        },
      }),
    ]);

    // Unit 53 — last 12 months of new enrollments, oldest first.
    const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const recentEnrollments = await tx.enrollment.findMany({
      where: { branchId: query.branchId, createdAt: { gte: twelveMonthsAgo, lt: monthEnd } },
      select: { createdAt: true },
    });
    const trendByMonth = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      trendByMonth.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const e of recentEnrollments) {
      const key = `${e.createdAt.getUTCFullYear()}-${String(e.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      if (trendByMonth.has(key)) {
        trendByMonth.set(key, (trendByMonth.get(key) ?? 0) + 1);
      }
    }
    const enrollmentTrend = Array.from(trendByMonth.entries()).map(([month, count]) => ({ month, count }));

    // Unit 53 — headcount + how many active staff have an approved leave covering today.
    const [headcount, onLeaveToday] = await Promise.all([
      tx.staff.count({ where: { branchId: query.branchId, deletedAt: null } }),
      tx.leaveRequest.count({
        where: {
          branchId: query.branchId,
          status: "APPROVED",
          fromDate: { lt: dayEnd },
          toDate: { gte: dayStart },
        },
      }),
    ]);

    return {
      collectionPercent,
      totalDues,
      attendancePercent,
      admissionsFunnel: { enquiries, applications, converted },
      enrollmentTrend,
      staffMetrics: { headcount, onLeaveToday },
    };
  });
}

/**
 * Unit 69 scope #6 — a thin slice reusing existing data, not new business
 * logic: a teacher's own assigned sections (Unit 06's TeacherAssignment),
 * whether today's attendance is marked for each, and this month's homework
 * they've posted (Unit 23's Homework.createdById).
 */
export async function getTeacherSummary(auth: RequestAuth) {
  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    throw new AppError("VALIDATION_ERROR", "dashboard.errors.staffOnly");
  }

  const now = new Date();
  const { start: dayStart, end: dayEnd } = dayRange(now);
  const { start: monthStart, end: monthEnd } = monthRange(now);

  return withTenant(auth.tenantId, async (tx) => {
    const assignments = await tx.teacherAssignment.findMany({ where: { staffId: staff.id } });
    const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];

    let sectionsMarkedToday = 0;
    for (const sectionId of sectionIds) {
      const marked = await tx.attendanceRecord.findFirst({
        where: { sectionId, date: { gte: dayStart, lt: dayEnd } },
      });
      if (marked) sectionsMarkedToday += 1;
    }
    const attendanceMarkedPercent = sectionIds.length === 0 ? 0 : Math.round((sectionsMarkedToday / sectionIds.length) * 100);

    const homeworkPostedThisMonth = await tx.homework.count({
      where: { createdById: auth.userId, createdAt: { gte: monthStart, lt: monthEnd } },
    });

    return {
      assignedSectionCount: sectionIds.length,
      attendanceMarkedPercent,
      homeworkPostedThisMonth,
    };
  });
}

/**
 * Unit 69 scope #6 — an accountant's own collection-today figure, reusing
 * Unit 12's Payment model unchanged.
 */
export async function getAccountantSummary(auth: RequestAuth) {
  const now = new Date();
  const { start: dayStart, end: dayEnd } = dayRange(now);

  return withTenant(auth.tenantId, async (tx) => {
    const paymentsToday = await tx.payment.findMany({
      where: { receivedById: auth.userId, status: "SUCCESS", createdAt: { gte: dayStart, lt: dayEnd } },
    });
    const collectedTodayPaise = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

    return {
      collectedTodayPaise,
      paymentsCollectedToday: paymentsToday.length,
    };
  });
}
