import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const feeTypeValues = ["TUITION", "TRANSPORT", "EXAM", "ADMISSION", "LAB", "MISC"] as const;

export const createFeeHeadSchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  name: z.string().trim().min(1, "fee.errors.nameRequired"),
  type: z.enum(feeTypeValues),
});
export type CreateFeeHeadInput = z.infer<typeof createFeeHeadSchema>;

export const patchFeeHeadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(feeTypeValues).optional(),
});
export type PatchFeeHeadInput = z.infer<typeof patchFeeHeadSchema>;

export const listFeeHeadsQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  ...pagination,
});
export type ListFeeHeadsQueryInput = z.infer<typeof listFeeHeadsQuerySchema>;

export const createFeeStructureSchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  sessionId: z.string().min(1, "fee.errors.sessionRequired"),
  classId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "fee.errors.nameRequired"),
});
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;

export const patchFeeStructureSchema = z.object({
  name: z.string().trim().min(1).optional(),
  classId: z.string().min(1).nullable().optional(),
});
export type PatchFeeStructureInput = z.infer<typeof patchFeeStructureSchema>;

export const listFeeStructuresQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  sessionId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  ...pagination,
});
export type ListFeeStructuresQueryInput = z.infer<typeof listFeeStructuresQuerySchema>;

const feeFrequencyValues = ["ONE_TIME", "MONTHLY", "QUARTERLY", "TERM", "ANNUAL"] as const;

export const createFeeStructureItemSchema = z.object({
  feeHeadId: z.string().min(1, "fee.errors.feeHeadRequired"),
  amount: z.coerce.number().int().min(0, "fee.errors.amountInvalid"),
  frequency: z.enum(feeFrequencyValues),
  dueDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
});
export type CreateFeeStructureItemInput = z.infer<typeof createFeeStructureItemSchema>;

export const createFineRuleSchema = z.object({
  graceDays: z.coerce.number().int().min(0, "fee.errors.graceDaysInvalid"),
  isPercent: z.boolean(),
  value: z.coerce.number().int().min(0, "fee.errors.amountInvalid"),
});
export type CreateFineRuleInput = z.infer<typeof createFineRuleSchema>;

export const patchFineRuleSchema = z.object({
  graceDays: z.coerce.number().int().min(0).optional(),
  isPercent: z.boolean().optional(),
  value: z.coerce.number().int().min(0).optional(),
});
export type PatchFineRuleInput = z.infer<typeof patchFineRuleSchema>;

export const assignFeeStructureSchema = z.object({
  classId: z.string().min(1, "fee.errors.classRequired"),
});
export type AssignFeeStructureInput = z.infer<typeof assignFeeStructureSchema>;

export const createFeeAssignmentSchema = z.object({
  studentId: z.string().min(1, "fee.errors.studentRequired"),
  structureId: z.string().min(1, "fee.errors.structureRequired"),
});
export type CreateFeeAssignmentInput = z.infer<typeof createFeeAssignmentSchema>;

export const listFeeAssignmentsQuerySchema = z.object({
  studentId: z.string().min(1).optional(),
  structureId: z.string().min(1).optional(),
  ...pagination,
});
export type ListFeeAssignmentsQueryInput = z.infer<typeof listFeeAssignmentsQuerySchema>;

const concessionTypeValues = ["RTE", "BPL", "SIBLING", "STAFF", "MERIT", "SCHOLARSHIP", "OTHER"] as const;

export const createConcessionSchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  studentId: z.string().min(1, "fee.errors.studentRequired"),
  type: z.enum(concessionTypeValues),
  value: z.coerce.number().int().min(0, "fee.errors.amountInvalid"),
  isPercent: z.boolean(),
});
export type CreateConcessionInput = z.infer<typeof createConcessionSchema>;

export const patchConcessionSchema = z.object({
  type: z.enum(concessionTypeValues).optional(),
  value: z.coerce.number().int().min(0).optional(),
  isPercent: z.boolean().optional(),
});
export type PatchConcessionInput = z.infer<typeof patchConcessionSchema>;

const concessionDecisionValues = ["APPROVED", "REJECTED"] as const;

export const decideConcessionSchema = z.object({
  status: z.enum(concessionDecisionValues),
});
export type DecideConcessionInput = z.infer<typeof decideConcessionSchema>;

const concessionStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;

export const listConcessionsQuerySchema = z.object({
  branchId: z.string().min(1, "fee.errors.branchRequired"),
  studentId: z.string().min(1).optional(),
  status: z.enum(concessionStatusValues).optional(),
  ...pagination,
});
export type ListConcessionsQueryInput = z.infer<typeof listConcessionsQuerySchema>;
