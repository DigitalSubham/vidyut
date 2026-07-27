import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const onlinePaymentModeValues = ["UPI", "CARD", "NETBANKING", "WALLET"] as const;

export const initiateOnlinePaymentSchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  studentId: z.string().min(1, "fee.errors.studentRequired"),
  invoiceId: z.string().min(1).optional(),
  amount: z.coerce.number().int().min(1, "fee.errors.amountInvalid"),
  mode: z.enum(onlinePaymentModeValues),
});
export type InitiateOnlinePaymentInput = z.infer<typeof initiateOnlinePaymentSchema>;

export const createRefundRequestSchema = z.object({
  amount: z.coerce.number().int().min(1, "fee.errors.amountInvalid"),
  reason: z.string().trim().min(1, "fee.errors.refundReasonRequired"),
});
export type CreateRefundRequestInput = z.infer<typeof createRefundRequestSchema>;

const refundDecisionValues = ["APPROVED", "REJECTED"] as const;

export const decideRefundRequestSchema = z.object({
  status: z.enum(refundDecisionValues),
});
export type DecideRefundRequestInput = z.infer<typeof decideRefundRequestSchema>;

const refundStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;

export const listRefundRequestsQuerySchema = z.object({
  paymentId: z.string().min(1).optional(),
  status: z.enum(refundStatusValues).optional(),
  ...pagination,
});
export type ListRefundRequestsQueryInput = z.infer<typeof listRefundRequestsQuerySchema>;
