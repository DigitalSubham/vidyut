import type { Job } from "bullmq";
import type { GuardianInvitePayload } from "@vidyut/types";

/**
 * The "send" half of a guardian invite (context/feature-specs/08-parents-
 * guardians.md) — OTP generation/storage already happened synchronously in
 * apps/api (needs Redis + the throttle logic in core/auth/otp.ts); only the
 * notification send is deferred here (AGENTS.md invariant #2). Same stub-sms
 * approach as apps/api's sendOtpSms — not shared across apps, duplicated on
 * purpose (same pattern as this worker's own storage.ts).
 */
export async function processGuardianInvite(job: Job<GuardianInvitePayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] guardian invite OTP for ${job.data.phone}: ${job.data.code}`);
  return { phone: job.data.phone, sentAt: new Date().toISOString() };
}
