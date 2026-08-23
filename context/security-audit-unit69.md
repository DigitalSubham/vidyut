# Security Audit — Unit 69, scope #3

A review pass, not new code (per the spec: "a review... unless it finds a real gap"). Covers JWT expiry, refresh-token rotation, rate-limit thresholds, and the password policy decision (Open Question 1) against real production-traffic assumptions for a 200–800-student Bihar school.

## 1. JWT expiry

- Access token: **15 minutes** (`apps/api/src/core/config.ts` `accessTtlSeconds`).
- Refresh token: **30 days** (`refreshTtlSeconds`).
- **Finding: acceptable.** A 15-minute access window limits the blast radius of a leaked token without forcing frequent re-logins (the refresh flow handles renewal silently). 30 days for refresh matches how infrequently parents/staff at this ICP re-open the app; shorter would increase support load ("why do I keep getting logged out") for no proportionate security gain at this threat model.
- No action taken.

## 2. Refresh-token rotation

- `apps/api/src/core/auth/tokens.ts`'s `rotateRefreshToken` issues a new refresh token and invalidates the old one on every use (`RefreshToken.revokedAt`, Unit 03); `revokeRefreshToken` supports explicit logout.
- **Finding: correctly implemented rotation-on-use**, the standard defense against a stolen refresh token being replayed indefinitely. Already built (Unit 03), confirmed still in place.
- No action taken.

## 3. Rate limiting

- `apps/api/src/core/rate-limit.ts`: a general limiter at **300 requests/minute per IP** (10,000 in test mode) applied globally; auth-specific endpoints (login/OTP) layer a stricter limiter on top (Unit 04).
- **Finding: reasonable for launch scale.** 300 req/min/IP comfortably covers a single school's legitimate peak (bulk attendance marking, fee-day traffic) while still bounding brute-force attempts on non-auth endpoints. The auth-specific stricter limit is the one that actually matters for credential-stuffing resistance, and it's already separately configured.
- No action taken.

## 4. Password policy (Open Question 1)

**Confirmed with the user: length-only, no complexity requirement, no rotation policy.** The existing `z.string().min(8)` in `packages/validation/src/auth.ts` (Unit 03) already implements this — no code change needed this unit. Rationale (matches the user's own reasoning and current NIST guidance): mandatory complexity/rotation rules push users toward predictable patterns (`Password1!`, `Password2!`) and increase support load without a proportionate security gain; rate-limiting + 2FA (already built) are the actual controls doing the work here.

## Conclusion

No code changes required from this pass — every reviewed area was already correctly built in earlier units. This is the expected outcome for a "review, not new code" scope item; a real gap would have been called out and fixed here if found.
