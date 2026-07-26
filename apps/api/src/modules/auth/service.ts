import { prisma, withTenant } from "@vidyut/db";
import type {
  LogoutInput,
  OtpRequestInput,
  OtpVerifyInput,
  RefreshInput,
  StaffLoginInput,
  TwoFaVerifyInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { verifyPassword } from "../../core/auth/password";
import { generateAndStoreOtp, sendOtpSms, verifyAndConsumeOtp } from "../../core/auth/otp";
import { createTwoFaChallenge, sendTwoFaCode, verifyAndConsumeTwoFaChallenge } from "../../core/auth/two-fa";
import { issueTokenPair, loadUserAuthContext, rotateRefreshToken, revokeRefreshToken, type TokenPair } from "../../core/auth/tokens";

const isDev = process.env.NODE_ENV !== "production";

function invalidCredentials(): never {
  throw new AppError("UNAUTHENTICATED", "auth.errors.invalidCredentials");
}

function invalidOtp(): never {
  throw new AppError("UNAUTHENTICATED", "auth.errors.invalidOtpCode");
}

/**
 * Tenant is platform-level (no RLS) — safe to look up before we know a user.
 * Returns null rather than throwing: callers must fold "no such tenant" into
 * the same generic failure as "no such user" / "wrong password", so a caller
 * can't enumerate valid tenant slugs or registered phone/email addresses by
 * watching which requests 404 vs which don't.
 */
async function resolveTenantBySlug(tenantSlug: string) {
  return prisma.tenant.findUnique({ where: { slug: tenantSlug } });
}

export async function requestOtp(
  input: OtpRequestInput
): Promise<{ phone: string; devCode?: string }> {
  const tenant = await resolveTenantBySlug(input.tenantSlug);
  const user = tenant
    ? await withTenant(tenant.id, (tx) =>
        tx.user.findUnique({ where: { tenantId_phone: { tenantId: tenant.id, phone: input.phone } } })
      )
    : null;

  // Same response whether or not the tenant/user exists — no OTP is actually
  // generated for a nonexistent combination, so nothing is sent, but the
  // caller can't tell that from the response shape.
  if (!tenant || !user) {
    return { phone: input.phone };
  }

  const code = await generateAndStoreOtp(`${tenant.id}:${input.phone}`);
  sendOtpSms(input.phone, code);

  return { phone: input.phone, ...(isDev ? { devCode: code } : {}) };
}

export async function verifyOtp(input: OtpVerifyInput): Promise<TokenPair> {
  const tenant = await resolveTenantBySlug(input.tenantSlug);
  if (!tenant) {
    invalidOtp();
  }

  const ok = await verifyAndConsumeOtp(`${tenant.id}:${input.phone}`, input.code);
  if (!ok) {
    invalidOtp();
  }

  const user = await withTenant(tenant.id, (tx) =>
    tx.user.findUnique({ where: { tenantId_phone: { tenantId: tenant.id, phone: input.phone } } })
  );
  if (!user) {
    // Only reachable if the user was deleted between OTP request and verify.
    invalidOtp();
  }

  const ctx = await loadUserAuthContext(tenant.id, user.id);
  return issueTokenPair(ctx);
}

export async function staffLogin(
  input: StaffLoginInput
): Promise<{ challenge: string; devCode?: string } | TokenPair> {
  const tenant = await resolveTenantBySlug(input.tenantSlug);
  if (!tenant) {
    invalidCredentials();
  }

  const user = await withTenant(tenant.id, (tx) =>
    tx.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email: input.email } } })
  );

  if (!user || !user.passwordHash) {
    invalidCredentials();
  }

  const passwordOk = await verifyPassword(user.passwordHash, input.password);
  if (!passwordOk) {
    invalidCredentials();
  }

  if (user.twoFactorEnabled) {
    const { challengeId, code } = await createTwoFaChallenge(user.id, tenant.id);
    sendTwoFaCode(user.id, code);
    return { challenge: challengeId, ...(isDev ? { devCode: code } : {}) };
  }

  const ctx = await loadUserAuthContext(tenant.id, user.id);
  return issueTokenPair(ctx);
}

export async function verifyTwoFa(input: TwoFaVerifyInput): Promise<TokenPair> {
  const resolved = await verifyAndConsumeTwoFaChallenge(input.challenge, input.code);
  if (!resolved) {
    throw new AppError("UNAUTHENTICATED", "auth.errors.invalidChallenge");
  }

  const ctx = await loadUserAuthContext(resolved.tenantId, resolved.userId);
  return issueTokenPair(ctx);
}

export async function refresh(input: RefreshInput): Promise<TokenPair> {
  return rotateRefreshToken(input.refreshToken);
}

export async function logout(input: LogoutInput): Promise<void> {
  await revokeRefreshToken(input.refreshToken);
}
