import { z } from "zod";

// --- Unit 62: Accounting & Finance (export-first path) ---

export const createExpenseHeadSchema = z.object({
  branchId: z.string().min(1, "accounting.errors.branchRequired"),
  name: z.string().trim().min(1, "accounting.errors.nameRequired"),
});
export type CreateExpenseHeadInput = z.infer<typeof createExpenseHeadSchema>;

export const listExpenseHeadsQuerySchema = z.object({
  branchId: z.string().min(1, "accounting.errors.branchRequired"),
});
export type ListExpenseHeadsQueryInput = z.infer<typeof listExpenseHeadsQuerySchema>;

export const createExpenseSchema = z.object({
  branchId: z.string().min(1, "accounting.errors.branchRequired"),
  headId: z.string().min(1, "accounting.errors.headRequired"),
  amountPaise: z.coerce.number().int().positive(),
  vendorName: z.string().trim().min(1).optional(),
  date: z.coerce.date(),
  note: z.string().trim().min(1).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  branchId: z.string().min(1, "accounting.errors.branchRequired"),
});
export type ListExpensesQueryInput = z.infer<typeof listExpensesQuerySchema>;

export const exportAccountingQuerySchema = z.object({
  branchId: z.string().min(1, "accounting.errors.branchRequired"),
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type ExportAccountingQueryInput = z.infer<typeof exportAccountingQuerySchema>;
