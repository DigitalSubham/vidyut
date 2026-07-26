import type { Job } from "bullmq";
import type { DemoPingPayload } from "@vidyut/types";

/**
 * Proves the enqueue -> process -> status round trip (Unit 04 DoD). Real
 * job handlers (notifications, PDFs, imports) land here per domain unit,
 * following the same shape: validate payload, do the work, return a result
 * that GET /jobs/:id can surface.
 */
export async function processDemoPing(job: Job<DemoPingPayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] demo.ping: ${job.data.message}`);
  return { echoed: job.data.message, processedAt: new Date().toISOString() };
}
