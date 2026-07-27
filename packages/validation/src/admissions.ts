import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const enquiryStageValues = ["NEW", "CONTACTED", "VISITED", "APPLIED", "ADMITTED", "LOST"] as const;

export const createEnquirySchema = z.object({
  branchId: z.string().min(1, "admission.errors.branchRequired"),
  childName: z.string().trim().min(1, "admission.errors.childNameRequired"),
  guardianName: z.string().trim().min(1, "admission.errors.guardianNameRequired"),
  phone: z.string().trim().min(1, "admission.errors.phoneRequired"),
  source: z.string().trim().min(1, "admission.errors.sourceRequired"),
  stage: z.enum(enquiryStageValues).default("NEW"),
  assignedToId: z.string().min(1).optional(),
  followUpAt: z.coerce.date().optional(),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const patchEnquirySchema = z.object({
  childName: z.string().trim().min(1).optional(),
  guardianName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  stage: z.enum(enquiryStageValues).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  followUpAt: z.coerce.date().nullable().optional(),
});
export type PatchEnquiryInput = z.infer<typeof patchEnquirySchema>;

export const listEnquiriesQuerySchema = z.object({
  branchId: z.string().min(1, "admission.errors.branchRequired"),
  stage: z.enum(enquiryStageValues).optional(),
  ...pagination,
});
export type ListEnquiriesQueryInput = z.infer<typeof listEnquiriesQuerySchema>;

/** v1's one fixed minimal formData shape (context/feature-specs/10's scope §3). */
const applicationFormDataSchema = z.object({
  childName: z.string().trim().min(1, "admission.errors.childNameRequired"),
  dob: z.coerce.date(),
  guardianName: z.string().trim().min(1, "admission.errors.guardianNameRequired"),
  guardianPhone: z.string().trim().min(1, "admission.errors.phoneRequired"),
  priorSchool: z.string().trim().min(1).optional(),
});

const applicationStatusValues = ["DRAFT", "SUBMITTED", "OFFERED", "CONFIRMED", "REJECTED"] as const;

export const createApplicationSchema = z.object({
  branchId: z.string().min(1, "admission.errors.branchRequired"),
  enquiryId: z.string().min(1).optional(),
  classAppliedId: z.string().min(1, "admission.errors.classRequired"),
  formData: applicationFormDataSchema,
  status: z.enum(applicationStatusValues).default("DRAFT"),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// CONFIRMED is excluded here — it's set exclusively by POST
// /applications/:id/convert (alongside creating the Student), never by a
// plain PATCH, so status can't drift out of sync with studentId.
const patchableApplicationStatusValues = ["DRAFT", "SUBMITTED", "OFFERED", "REJECTED"] as const;

export const patchApplicationSchema = z.object({
  classAppliedId: z.string().min(1).optional(),
  formData: applicationFormDataSchema.optional(),
  status: z.enum(patchableApplicationStatusValues).optional(),
});
export type PatchApplicationInput = z.infer<typeof patchApplicationSchema>;

export const convertApplicationSchema = z.object({
  sectionId: z.string().min(1, "admission.errors.sectionRequired"),
});
export type ConvertApplicationInput = z.infer<typeof convertApplicationSchema>;

export const listApplicationsQuerySchema = z.object({
  branchId: z.string().min(1, "admission.errors.branchRequired"),
  status: z.enum(applicationStatusValues).optional(),
  ...pagination,
});
export type ListApplicationsQueryInput = z.infer<typeof listApplicationsQuerySchema>;
