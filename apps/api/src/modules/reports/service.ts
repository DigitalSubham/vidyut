import { withTenant } from "@vidyut/db";
import type { ReportQueryInput } from "@vidyut/validation";
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

/**
 * Unit 55 — reuses the dashboard's own access model (Unit 28) rather than
 * adding a new `report.*` permission: reports are the same MIS surface for
 * the same OWNER/PRINCIPAL audience, just detailed instead of summarized.
 */
export async function assertReportAccess(auth: RequestAuth): Promise<void> {
  const allowed = (await userHasPermission(auth, "dashboard.owner")) || (await userHasPermission(auth, "dashboard.principal"));
  if (!allowed) {
    throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
  }
}

export async function getAttendanceReport(auth: RequestAuth, query: ReportQueryInput) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const records = await tx.attendanceRecord.findMany({
      where: { branchId: query.branchId, date: { gte: query.from, lte: query.to } },
      include: { student: true },
    });

    const byStudent = new Map<string, { name: string; admissionNo: string; present: number; total: number }>();
    for (const r of records) {
      const entry = byStudent.get(r.studentId) ?? {
        name: `${r.student.firstName} ${r.student.lastName}`,
        admissionNo: r.student.admissionNo,
        present: 0,
        total: 0,
      };
      entry.total += 1;
      if (["PRESENT", "LATE", "HALF_DAY"].includes(r.status)) {
        entry.present += 1;
      }
      byStudent.set(r.studentId, entry);
    }

    return Array.from(byStudent.entries()).map(([studentId, v]) => ({
      studentId,
      admissionNo: v.admissionNo,
      name: v.name,
      daysPresent: v.present,
      daysMarked: v.total,
      attendancePercent: v.total > 0 ? Math.round((v.present / v.total) * 10000) / 100 : 0,
    }));
  });
}

export async function getFeesReport(auth: RequestAuth, query: ReportQueryInput) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const invoices = await tx.invoice.findMany({
      where: { branchId: query.branchId, createdAt: { gte: query.from, lte: query.to } },
      include: { student: true, items: true, payments: { where: { status: "SUCCESS" } } },
    });

    return invoices.map((inv) => {
      const total = invoiceTotal(inv.items);
      const collected = inv.payments.reduce((s, p) => s + p.amount, 0);
      return {
        invoiceNumber: inv.number,
        admissionNo: inv.student.admissionNo,
        studentName: `${inv.student.firstName} ${inv.student.lastName}`,
        periodLabel: inv.periodLabel,
        invoiced: total,
        collected,
        outstanding: Math.max(0, total - collected),
        status: inv.status,
      };
    });
  });
}

export async function getExamsReport(auth: RequestAuth, query: ReportQueryInput) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const exams = await tx.exam.findMany({
      where: { branchId: query.branchId, createdAt: { gte: query.from, lte: query.to } },
      include: { examSubjects: { include: { marksEntries: true } } },
    });

    return exams.map((exam) => {
      let totalEntries = 0;
      let totalPercent = 0;
      let passCount = 0;
      for (const subject of exam.examSubjects) {
        for (const entry of subject.marksEntries) {
          if (entry.isAbsent || entry.marks === null) continue;
          totalEntries += 1;
          totalPercent += (entry.marks / subject.maxMarks) * 100;
          if (entry.marks >= subject.passMarks) passCount += 1;
        }
      }
      return {
        examName: exam.name,
        type: exam.type,
        totalEntries,
        averagePercent: totalEntries > 0 ? Math.round((totalPercent / totalEntries) * 100) / 100 : 0,
        passPercent: totalEntries > 0 ? Math.round((passCount / totalEntries) * 10000) / 100 : 0,
      };
    });
  });
}

export async function getAdmissionsReport(auth: RequestAuth, query: ReportQueryInput) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const [enquiries, applications] = await Promise.all([
      tx.enquiry.findMany({ where: { branchId: query.branchId, createdAt: { gte: query.from, lte: query.to } } }),
      tx.application.findMany({ where: { branchId: query.branchId, createdAt: { gte: query.from, lte: query.to } } }),
    ]);

    return [
      ...enquiries.map((e) => ({
        type: "enquiry" as const,
        childName: e.childName,
        guardianName: e.guardianName,
        stageOrStatus: e.stage,
        createdAt: e.createdAt.toISOString(),
      })),
      ...applications.map((a) => ({
        type: "application" as const,
        childName: null,
        guardianName: null,
        stageOrStatus: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
    ];
  });
}

export async function getStaffReport(auth: RequestAuth, query: ReportQueryInput) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const staff = await tx.staff.findMany({
      where: { branchId: query.branchId, deletedAt: null },
      include: {
        user: true,
        leaveRequests: {
          where: { status: "APPROVED", fromDate: { lte: query.to }, toDate: { gte: query.from } },
        },
      },
    });

    return staff.map((s) => ({
      employeeNo: s.employeeNo,
      name: s.user.name,
      designation: s.designation,
      type: s.type,
      leaveDaysInRange: s.leaveRequests.length,
    }));
  });
}

export async function getKpiSummary(auth: RequestAuth, branchId: string) {
  await assertReportAccess(auth);
  assertBranchAccess(auth, branchId);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const query: ReportQueryInput = { branchId, from: monthStart, to: monthEnd, format: "json" };

  const [attendance, fees, exams, admissions, staff] = await Promise.all([
    getAttendanceReport(auth, query),
    getFeesReport(auth, query),
    getExamsReport(auth, query),
    getAdmissionsReport(auth, query),
    getStaffReport(auth, query),
  ]);

  const avgAttendance =
    attendance.length > 0
      ? Math.round((attendance.reduce((s, a) => s + a.attendancePercent, 0) / attendance.length) * 100) / 100
      : null;
  const totalInvoiced = fees.reduce((s, f) => s + f.invoiced, 0);
  const totalCollected = fees.reduce((s, f) => s + f.collected, 0);

  return {
    period: { from: monthStart.toISOString(), to: monthEnd.toISOString() },
    attendance: { studentsTracked: attendance.length, averagePercent: avgAttendance },
    fees: { totalInvoiced, totalCollected, collectionPercent: totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 10000) / 100 : 0 },
    exams: { examCount: exams.length },
    admissions: { enquiries: admissions.filter((a) => a.type === "enquiry").length, applications: admissions.filter((a) => a.type === "application").length },
    staff: { headcount: staff.length },
  };
}
