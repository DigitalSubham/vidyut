import { z } from "zod";

// --- Unit 63: Payroll & Salary (export-first path) ---

export const upsertSalaryStructureSchema = z.object({
  branchId: z.string().min(1, "payroll.errors.branchRequired"),
  staffId: z.string().min(1, "payroll.errors.staffRequired"),
  basicPaise: z.coerce.number().int().min(0),
  hraPaise: z.coerce.number().int().min(0),
  allowances: z.record(z.string(), z.number().int()).default({}),
  deductions: z.record(z.string(), z.number().int()).default({}),
});
export type UpsertSalaryStructureInput = z.infer<typeof upsertSalaryStructureSchema>;

export const listSalaryStructuresQuerySchema = z.object({
  branchId: z.string().min(1, "payroll.errors.branchRequired"),
});
export type ListSalaryStructuresQueryInput = z.infer<typeof listSalaryStructuresQuerySchema>;

export const exportPayrollQuerySchema = z.object({
  branchId: z.string().min(1, "payroll.errors.branchRequired"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
export type ExportPayrollQueryInput = z.infer<typeof exportPayrollQuerySchema>;
