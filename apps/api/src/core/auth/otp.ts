import { randomInt } from "node:crypto";
import { redis } from "../redis";
import { config } from "../config";
import { AppError } from "../errors";

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
  if (!stored || stored !== code) {
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
