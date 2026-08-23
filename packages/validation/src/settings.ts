import { z } from "zod";

/** Unit 36 — school-group-level profile, PATCH /tenants/me/profile (settings.manage). */
export const patchTenantProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  logoUrl: z.string().trim().url().optional(),
  locale: z.string().trim().min(2).optional(),
  admissionNoPrefix: z.string().trim().max(10).optional(),
  invoiceNoPrefix: z.string().trim().max(10).optional(),
  // Unit 54 — public-site contact section.
  contactPhone: z.string().trim().min(1).optional(),
  contactEmail: z.string().trim().email().optional(),
  mapUrl: z.string().trim().url().optional(),
});
export type PatchTenantProfileInput = z.infer<typeof patchTenantProfileSchema>;
