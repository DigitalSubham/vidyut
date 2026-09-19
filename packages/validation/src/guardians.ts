import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const guardianRelationValues = ["FATHER", "MOTHER", "GUARDIAN", "OTHER"] as const;

/** Bare 10-digit mobile number, no country code — Guardian.phone becomes User.phone verbatim on invite (see guardians/service.ts's inviteGuardian), and a bare 10-digit number already satisfies auth.ts's OTP-login regex, so this stays compatible. */
const tenDigitPhone = z.string().trim().regex(/^\d{10}$/, "guardian.errors.invalidPhone");

export const createGuardianSchema = z.object({
  name: z.string().trim().min(1, "guardian.errors.nameRequired"),
  relation: z.enum(guardianRelationValues),
  phone: tenDigitPhone,
  alternatePhone: tenDigitPhone.optional(),
  whatsappOptIn: z.boolean().default(false),
  email: z.string().trim().email("guardian.errors.invalidEmail").optional(),
  occupation: z.string().trim().min(1).optional(),
});
export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;

export const patchGuardianSchema = z.object({
  name: z.string().trim().min(1).optional(),
  relation: z.enum(guardianRelationValues).optional(),
  phone: tenDigitPhone.optional(),
  alternatePhone: tenDigitPhone.optional(),
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
