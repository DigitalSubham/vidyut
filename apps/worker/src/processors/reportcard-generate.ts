import type { Job } from "bullmq";
import type { ReportCardGeneratePayload } from "@vidyut/types";

/**
 * Stubbed like Unit 12's receipt.generate — proves the enqueue -> process
 * round trip for report-card PDFs without real Puppeteer rendering
 * (context/feature-specs/19's Open Question 1: no PDF infra or
 * tenant-configurable template renderer exists yet). Real rendering +
 * ReportCard.pdfUrl population is a later pass.
 */
export async function processReportCardGenerate(job: Job<ReportCardGeneratePayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] reportcard.generate: report card ${job.data.reportCardId} (no-op — real PDF rendering is a later unit)`);
  return { reportCardId: job.data.reportCardId, note: "stub" };
}
