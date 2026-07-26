import { randomInt, randomUUID } from "node:crypto";
import { redis } from "../redis";
import { config } from "../config";

function challengeKey(challengeId: string): string {
  return `2fa:challenge:${challengeId}`;
}

interface ChallengePayload {
  userId: string;
  tenantId: string;
  code: string;
}

/** Reuses the OTP-style short-code mechanism as staff 2FA's second factor. */
export async function createTwoFaChallenge(
  userId: string,
  tenantId: string
): Promise<{ challengeId: string; code: string }> {
  const challengeId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const payload: ChallengePayload = { userId, tenantId, code };
  await redis.set(challengeKey(challengeId), JSON.stringify(payload), "EX", config.otp.codeTtlSeconds);
  return { challengeId, code };
}

export async function verifyAndConsumeTwoFaChallenge(
  challengeId: string,
  code: string
): Promise<{ userId: string; tenantId: string } | null> {
  const raw = await redis.get(challengeKey(challengeId));
  if (!raw) {
    return null;
  }
  const payload = JSON.parse(raw) as ChallengePayload;
  if (payload.code !== code) {
    return null;
  }
  await redis.del(challengeKey(challengeId));
  return { userId: payload.userId, tenantId: payload.tenantId };
}

/** Stubbed behind the notification/jobs interface — see otp.ts. */
export function sendTwoFaCode(userId: string, code: string): void {
  // eslint-disable-next-line no-console
  console.log(`[stub sms] 2FA code for user ${userId}: ${code}`);
}
