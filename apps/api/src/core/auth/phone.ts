/**
 * OTP login accepts a bare 10-digit Indian mobile number (what a user
 * naturally types, and what apps/mobile's PhoneScreen sends as-is with no
 * client-side formatting) as shorthand for the E.164 form phone numbers are
 * actually stored in (`User.phone`, e.g. seed data's "+919999999999").
 * Without this, a correctly-typed 10-digit number silently never matches
 * any user — requestOtp/verifyOtp both need to agree on the same
 * normalized form for the OTP flow to ever succeed for real input.
 * India-only per this project's market (AGENTS.md) — no other country
 * code is inferred.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (/^\d{10}$/.test(trimmed)) {
    return `+91${trimmed}`;
  }
  return trimmed;
}
