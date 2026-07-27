import { withTenant } from "@vidyut/db";
import type { DashboardSummaryQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { userHasPermission } from "../../core/guards/require-permission";
import type { RequestAuth } from "../../core/guards/types";
import { invoiceTotal } from "../payments/service";

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

    return {
      collectionPercent,
      totalDues,
      attendancePercent,
      admissionsFunnel: { enquiries, applications, converted },
    };
  });
}
