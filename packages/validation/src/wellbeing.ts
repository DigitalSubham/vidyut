import { z } from "zod";

// --- Unit 61: Health, Discipline & Others ---

export const upsertHealthRecordSchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
  condition: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  emergencyContact: z.string().trim().min(1, "wellbeing.errors.emergencyContactRequired"),
});
export type UpsertHealthRecordInput = z.infer<typeof upsertHealthRecordSchema>;

export const getHealthRecordQuerySchema = z.object({
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
});
export type GetHealthRecordQueryInput = z.infer<typeof getHealthRecordQuerySchema>;

const disciplineTypeValues = ["MERIT", "DEMERIT"] as const;

export const createDisciplineIncidentSchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
  type: z.enum(disciplineTypeValues),
  points: z.coerce.number().int().positive(),
  note: z.string().trim().min(1).optional(),
});
export type CreateDisciplineIncidentInput = z.infer<typeof createDisciplineIncidentSchema>;

export const listDisciplineIncidentsQuerySchema = z.object({
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
});
export type ListDisciplineIncidentsQueryInput = z.infer<typeof listDisciplineIncidentsQuerySchema>;

export const createAwardSchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
  title: z.string().trim().min(1, "wellbeing.errors.titleRequired"),
  awardedAt: z.coerce.date(),
});
export type CreateAwardInput = z.infer<typeof createAwardSchema>;

export const listAwardsQuerySchema = z.object({
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
});
export type ListAwardsQueryInput = z.infer<typeof listAwardsQuerySchema>;

export const canteenTxnSchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
  amountPaise: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1).optional(),
});
export type CanteenTxnInput = z.infer<typeof canteenTxnSchema>;

export const getCanteenWalletQuerySchema = z.object({
  studentId: z.string().min(1, "wellbeing.errors.studentRequired"),
});
export type GetCanteenWalletQueryInput = z.infer<typeof getCanteenWalletQuerySchema>;

export const createLostFoundEntrySchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
  itemDescription: z.string().trim().min(1, "wellbeing.errors.itemDescriptionRequired"),
  foundLocation: z.string().trim().min(1).optional(),
  foundAt: z.coerce.date(),
});
export type CreateLostFoundEntryInput = z.infer<typeof createLostFoundEntrySchema>;

export const listLostFoundEntriesQuerySchema = z.object({
  branchId: z.string().min(1, "wellbeing.errors.branchRequired"),
});
export type ListLostFoundEntriesQueryInput = z.infer<typeof listLostFoundEntriesQuerySchema>;
