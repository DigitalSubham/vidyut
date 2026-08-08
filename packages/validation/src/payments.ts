import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const invoiceStatusValues = ["PENDING", "PARTIAL", "PAID", "CANCELLED", "OVERDUE"] as const;

export const listInvoicesQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  studentId: z.string().min(1).optional(),
  status: z.enum(invoiceStatusValues).optional(),
  ...pagination,
});
export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQuerySchema>;

const paymentModeValues = [
  "CASH",
  "CHEQUE",
  "DD",
  "CARD",
  "UPI",
  "NETBANKING",
  "BANK",
  "WALLET",
] as const;

export const createPaymentSchema = z
  .object({
    branchId: z.string().min(1, "fee.errors.branchRequired"),
    studentId: z.string().min(1, "fee.errors.studentRequired"),
    invoiceId: z.string().min(1).optional(),
    amount: z.coerce.number().int().min(1, "fee.errors.amountInvalid"),
    mode: z.enum(paymentModeValues),
    reference: z.string().trim().min(1).optional(),
    // Unit 48 — cheque/PDC tracking, required together only when mode is CHEQUE.
    chequeNo: z.string().trim().min(1).optional(),
    bankName: z.string().trim().min(1).optional(),
    chequeDueDate: z.coerce.date().optional(),
  })
  .refine(
    (input) => input.mode !== "CHEQUE" || (input.chequeNo && input.bankName && input.chequeDueDate),
    { message: "fee.errors.chequeDetailsRequired", path: ["chequeNo"] }
  );
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// --- Unit 48: Fee Management Depth (Cheque/PDC Tracking) ---

const chequeStatusValues = ["PENDING", "CLEARED", "BOUNCED"] as const;

export const updateChequeStatusSchema = z.object({
  status: z.enum(["CLEARED", "BOUNCED"]),
});
export type UpdateChequeStatusInput = z.infer<typeof updateChequeStatusSchema>;

export const listChequesQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  status: z.enum(chequeStatusValues).optional(),
});
export type ListChequesQueryInput = z.infer<typeof listChequesQuerySchema>;

export const listPaymentsQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  studentId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  ...pagination,
});
export type ListPaymentsQueryInput = z.infer<typeof listPaymentsQuerySchema>;

export const feeReportsQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  classId: z.string().min(1).optional(),
});
export type FeeReportsQueryInput = z.infer<typeof feeReportsQuerySchema>;

export const createOpeningBalanceSchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  amount: z.coerce.number().int().min(1, "fee.errors.amountInvalid"),
  dueDate: z.coerce.date(),
  note: z.string().trim().min(1).optional(),
});
export type CreateOpeningBalanceInput = z.infer<typeof createOpeningBalanceSchema>;

// --- Unit 38: Fee Reconciliation & Receipt Corrections ---

export const reconciliationQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  date: z.coerce.date(),
});
export type ReconciliationQueryInput = z.infer<typeof reconciliationQuerySchema>;

export const cancelReceiptSchema = z.object({
  reason: z.string().trim().min(1, "fee.errors.cancelReasonRequired"),
});
export type CancelReceiptInput = z.infer<typeof cancelReceiptSchema>;
