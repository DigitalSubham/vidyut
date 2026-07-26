import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, "auth.errors.invalidPhone");

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "auth.errors.invalidOtpCode");

/**
 * api-conventions.md's `POST /auth/otp/request { phone }` shorthand omits
 * how the tenant is resolved — but phone is only unique per (tenantId,
 * phone), not globally, and User is RLS-scoped, so phone alone cannot
 * resolve a user. `tenantSlug` is required here until Unit 04/05 add a
 * hostname- or school-code-based resolution layer in front of this route;
 * that layer can populate tenantSlug instead of the client, without
 * changing this schema or the service logic. See progress-tracker.md.
 */
const tenantSlug = z.string().trim().min(1, "auth.errors.invalidTenantSlug");

export const otpRequestSchema = z.object({
  tenantSlug,
  phone,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  tenantSlug,
  phone,
  code: otpCode,
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const staffLoginSchema = z.object({
  tenantSlug,
  email: z.string().trim().email("auth.errors.invalidEmail"),
  password: z.string().min(8, "auth.errors.passwordTooShort"),
});
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const twoFaVerifySchema = z.object({
  challenge: z.string().min(1, "auth.errors.invalidChallenge"),
  code: otpCode,
});
export type TwoFaVerifyInput = z.infer<typeof twoFaVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "auth.errors.invalidRefreshToken"),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "auth.errors.invalidRefreshToken"),
});
export type LogoutInput = z.infer<typeof logoutSchema>;
