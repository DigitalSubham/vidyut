import { z } from "zod";

/** Unit 29 — the public, unauthenticated admission intake form. No branchId (the caller only knows a schoolCode); the service resolves the tenant's default branch. */
export const publicCreateEnquirySchema = z.object({
  childName: z.string().trim().min(1, "admission.errors.childNameRequired"),
  guardianName: z.string().trim().min(1, "admission.errors.guardianNameRequired"),
  phone: z.string().trim().min(1, "admission.errors.phoneRequired"),
  source: z.string().trim().min(1).default("website"),
});
export type PublicCreateEnquiryInput = z.infer<typeof publicCreateEnquirySchema>;
