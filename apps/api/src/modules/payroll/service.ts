import { withTenant } from "@vidyut/db";
import type { ExportPayrollQueryInput, UpsertSalaryStructureInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function upsertSalaryStructure(auth: RequestAuth, input: UpsertSalaryStructureInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.salaryStructure.upsert({
      where: { staffId: input.staffId },
      update: { basic: input.basicPaise, hra: input.hraPaise, allowances: input.allowances, deductions: input.deductions },
      create: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        staffId: input.staffId,
        basic: input.basicPaise,
        hra: input.hraPaise,
        allowances: input.allowances,
        deductions: input.deductions,
      },
    })
  );
}

export async function listSalaryStructures(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) => tx.salaryStructure.findMany({ where: { branchId } }));
}

export interface PayrollExportRow {
  staffId: string;
  employeeNo: string;
  name: string;
  basic: number;
  hra: number;
  allowancesTotal: number;
  deductionsTotal: number;
  unpaidLeaveDays: number;
  grossPay: number;
}

function jsonSum(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  return Object.values(value as Record<string, unknown>).reduce(
    (sum: number, v) => sum + (typeof v === "number" ? v : 0),
    0
  );
}

/**
 * Scope #2 — gross pay computed from SalaryStructure + Unit 09's existing
 * LeaveRequest data (UNPAID-type approved leave overlapping the month
 * reduces gross). No statutory (PF/ESI/TDS/PT) deduction — Open Question
 * 1's resolution: export-first, not a native calculator.
 *
 * ponytail: unpaid-leave reduction is a flat (basic+hra)/30 per-day rate, a
 * real simplification of how a payroll tool would actually prorate — good
 * enough for the export input, not a claim of statutory correctness.
 */
export async function exportPayroll(auth: RequestAuth, query: ExportPayrollQueryInput): Promise<PayrollExportRow[]> {
  assertBranchAccess(auth, query.branchId);

  const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1));
  const monthEnd = new Date(Date.UTC(query.year, query.month, 0, 23, 59, 59));

  return withTenant(auth.tenantId, async (tx) => {
    const structures = await tx.salaryStructure.findMany({
      where: { branchId: query.branchId },
      include: { staff: { select: { employeeNo: true, user: { select: { name: true } } } } },
    });

    const rows: PayrollExportRow[] = [];
    for (const s of structures) {
      const unpaidLeaves = await tx.leaveRequest.findMany({
        where: {
          staffId: s.staffId,
          type: "UNPAID",
          status: "APPROVED",
          fromDate: { lte: monthEnd },
          toDate: { gte: monthStart },
        },
      });

      let unpaidDays = 0;
      for (const leave of unpaidLeaves) {
        const from = leave.fromDate > monthStart ? leave.fromDate : monthStart;
        const to = leave.toDate < monthEnd ? leave.toDate : monthEnd;
        const days = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        unpaidDays += leave.halfDay ? days * 0.5 : days;
      }

      const allowancesTotal = jsonSum(s.allowances);
      const deductionsTotal = jsonSum(s.deductions);
      const perDayRate = (s.basic + s.hra) / 30;
      const grossPay = Math.round(s.basic + s.hra + allowancesTotal - deductionsTotal - perDayRate * unpaidDays);

      rows.push({
        staffId: s.staffId,
        employeeNo: s.staff.employeeNo,
        name: s.staff.user?.name ?? s.staff.employeeNo,
        basic: s.basic,
        hra: s.hra,
        allowancesTotal,
        deductionsTotal,
        unpaidLeaveDays: unpaidDays,
        grossPay,
      });
    }
    return rows;
  });
}
