import type { Job } from "bullmq";
import type { CertificateEsignRequestPayload } from "@vidyut/types";

/**
 * context/feature-specs/50-certificates-depth.md (Open Question 2) — gated
 * on ESIGN_API_KEY/ESIGN_PROVIDER_URL, same honest-stub posture as
 * apps/worker/src/providers/sms.ts: no credentials exist in this
 * environment, so this always logs a stub. The certificate's
 * `signatureStatus` stays REQUESTED either way — SIGNED only ever comes from
 * the provider's own webhook (see certificates/service.ts's
 * handleEsignWebhook), never faked here.
 */
export async function processCertificateEsignRequest(job: Job<CertificateEsignRequestPayload>) {
  const apiKey = process.env.ESIGN_API_KEY;
  const providerUrl = process.env.ESIGN_PROVIDER_URL;

  if (!apiKey || !providerUrl) {
    // eslint-disable-next-line no-console
    console.log(
      `[worker] certificate.esign-request: certificate ${job.data.certificateId} (stub, no ESIGN_API_KEY/ESIGN_PROVIDER_URL configured — request recorded, no provider called)`
    );
    return { certificateId: job.data.certificateId, note: "stub" };
  }

  try {
    const res = await fetch(providerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ certificateId: job.data.certificateId }),
    });
    if (!res.ok) {
      return { certificateId: job.data.certificateId, error: `esign provider responded ${res.status}` };
    }
    return { certificateId: job.data.certificateId, note: "requested" };
  } catch (error) {
    return { certificateId: job.data.certificateId, error: error instanceof Error ? error.message : String(error) };
  }
}
