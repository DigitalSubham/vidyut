import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const guardianRelationValues = ["FATHER", "MOTHER", "GUARDIAN", "OTHER"] as const;

export const createGuardianSchema = z.object({
  name: z.string().trim().min(1, "guardian.errors.nameRequired"),
  relation: z.enum(guardianRelationValues),
  phone: z.string().trim().min(1, "guardian.errors.phoneRequired"),
  alternatePhone: z.string().trim().min(1).optional(),
  whatsappOptIn: z.boolean().default(false),
  email: z.string().trim().email("guardian.errors.invalidEmail").optional(),
  occupation: z.string().trim().min(1).optional(),
});
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;

export const patchGuardianSchema = z.object({
  name: z.string().trim().min(1).optional(),
  relation: z.enum(guardianRelationValues).optional(),
  phone: z.string().trim().min(1).optional(),
  alternatePhone: z.string().trim().min(1).optional(),
  whatsappOptIn: z.boolean().optional(),
  email: z.string().trim().email("guardian.errors.invalidEmail").optional(),
  occupation: z.string().trim().min(1).optional(),
});
export type PatchGuardianInput = z.infer<typeof patchGuardianSchema>;

export const listGuardiansQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  ...pagination,
});
export type ListGuardiansQueryInput = z.infer<typeof listGuardiansQuerySchema>;

export const linkGuardianSchema = z.object({
  guardianId: z.string().min(1, "guardian.errors.guardianIdRequired"),
  isPrimary: z.boolean().default(false),
  canPay: z.boolean().default(false),
});
export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;

/** Unit 39 (DPDP) — the invite checkbox: consent must be explicitly true, not just present. */
export const inviteGuardianSchema = z.object({
  consent: z.boolean().refine((v) => v === true, "guardian.errors.consentRequired"),
});
export type InviteGuardianInput = z.infer<typeof inviteGuardianSchema>;
