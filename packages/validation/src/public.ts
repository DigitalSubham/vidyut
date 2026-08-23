import { z } from "zod";

/** Unit 29 — the public, unauthenticated admission intake form. No branchId (the caller only knows a schoolCode); the service resolves the tenant's default branch. */
export const publicCreateEnquirySchema = z.object({
  childName: z.string().trim().min(1, "admission.errors.childNameRequired"),
  guardianName: z.string().trim().min(1, "admission.errors.guardianNameRequired"),
  phone: z.string().trim().min(1, "admission.errors.phoneRequired"),
  source: z.string().trim().min(1).default("website"),
});
export type PublicCreateEnquiryInput = z.infer<typeof publicCreateEnquirySchema>;

/** Unit 54 — staff-facing create for the public site's notices section. */
export const createPublicNoticeSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  title: z.string().trim().min(1, "engagement.errors.titleRequired"),
  body: z.string().trim().min(1, "engagement.errors.bodyRequired"),
});
export type CreatePublicNoticeInput = z.infer<typeof createPublicNoticeSchema>;

export const listPublicNoticesQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
});
export type ListPublicNoticesQueryInput = z.infer<typeof listPublicNoticesQuerySchema>;
