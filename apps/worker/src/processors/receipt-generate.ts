import type { Job } from "bullmq";
import type { ReceiptGeneratePayload } from "@vidyut/types";

/**
 * Stubbed like Unit 05's appbuild.stub — proves the enqueue -> process round
 * trip for receipt PDFs without real Puppeteer rendering (context/feature-
 * specs/12's Decisions: no PDF infra or tenant-configurable template system
 * exists yet). Real rendering + Receipt.pdfUrl population is a later pass.
 */
export async function processReceiptGenerate(job: Job<ReceiptGeneratePayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] receipt.generate: receipt ${job.data.receiptId} (no-op — real PDF rendering is a later unit)`);
  return { receiptId: job.data.receiptId, note: "stub" };
}
