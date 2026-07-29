import type { Job } from "bullmq";
import type { StaffInvitePayload } from "@vidyut/types";

/**
 * The email "send" step for a staff invite's temp password (Unit 36) — same
 * honest-stub posture as guardian-invite.ts: no real SES/email provider is
 * wired yet (Unit 40's gap), so this just logs clearly rather than faking
 * a delivered email.
 */
export async function processStaffInvite(job: Job<StaffInvitePayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] staff invite temp password for ${job.data.email}: ${job.data.tempPassword}`);
  return { email: job.data.email, sentAt: new Date().toISOString() };
}
