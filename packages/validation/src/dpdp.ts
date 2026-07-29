import { z } from "zod";

export const createDataDeletionRequestSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});
export type CreateDataDeletionRequestInput = z.infer<typeof createDataDeletionRequestSchema>;

/** OWNER review — reject only; approving is the separate, more consequential `execute` action. */
export const rejectDataDeletionRequestSchema = z.object({
  reviewNote: z.string().trim().min(1, "dpdp.errors.reviewNoteRequired"),
});
export type RejectDataDeletionRequestInput = z.infer<typeof rejectDataDeletionRequestSchema>;
