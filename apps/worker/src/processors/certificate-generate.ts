import type { Job } from "bullmq";
import type { CertificateGeneratePayload } from "@vidyut/types";

/**
 * Stubbed like Unit 12's receipt.generate / Unit 19's reportcard.generate —
 * proves the enqueue -> process round trip without real Puppeteer rendering
 * (context/feature-specs/21's Open Question 3). Real rendering + pdfUrl
 * population is a later pass.
 */
export async function processCertificateGenerate(job: Job<CertificateGeneratePayload>) {
  // eslint-disable-next-line no-console
  console.log(`[worker] certificate.generate: certificate ${job.data.certificateId} (no-op — real PDF rendering is a later unit)`);
  return { certificateId: job.data.certificateId, note: "stub" };
}
