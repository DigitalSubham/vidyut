import { randomInt } from "node:crypto";
import { redis } from "../redis";
import { config } from "../config";
import { AppError } from "../errors";

/** Same non-production gate as `devCode` in modules/auth/service.ts — a staging deploy that doesn't set NODE_ENV=production gets this too, by the same convention. */
const isDev = process.env.NODE_ENV !== "production";
/** Dev/staging convenience: always accepted in place of the real code, so nobody has to read it out of server logs. Still requires a real OTP to have been requested first (the Redis key must exist) — this only skips "copy the code," not "request one." */
const DEV_FIXED_OTP = "1234";

function codeKey(phone: string): string {
  return `otp:code:${phone}`;
}

function throttleKey(phone: string): string {
  return `otp:throttle:${phone}`;
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Throttles via Redis INCR+EXPIRE, then stores a fresh code with a TTL. */
export async function generateAndStoreOtp(phone: string): Promise<string> {
  const attempts = await redis.incr(throttleKey(phone));
  if (attempts === 1) {
    await redis.expire(throttleKey(phone), config.otp.requestWindowSeconds);
  }
  if (attempts > config.otp.maxRequestsPerWindow) {
    throw new AppError("RATE_LIMITED", "auth.errors.otpRateLimited");
  }

  const code = generateCode();
  await redis.set(codeKey(phone), code, "EX", config.otp.codeTtlSeconds);
  return code;
}

export async function verifyAndConsumeOtp(phone: string, code: string): Promise<boolean> {
  const stored = await redis.get(codeKey(phone));
  if (!stored) {
    return false;
  }
  if (stored !== code && !(isDev && code === DEV_FIXED_OTP)) {
    return false;
  }
  await redis.del(codeKey(phone));
  return true;
}

/**
 * Stubbed behind the notification/jobs interface until the SMS provider is
 * chosen (context/feature-specs/03-auth-rbac.md) — Unit 04+ replaces this
 * with a real BullMQ job enqueue. Dev/test callers read the code from the
 * request's response instead of relying on this log line.
 */
export function sendOtpSms(phone: string, code: string): void {
  // eslint-disable-next-line no-console
  console.log(`[stub sms] OTP for ${phone}: ${code}`);
}
