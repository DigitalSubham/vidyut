import type { Job } from "bullmq";
import type { AppBuildStubPayload } from "@vidyut/types";

/**
 * Proves onboarding's enqueue call works end to end for dedicated-app
 * tenants. The real EAS build/submit pipeline is Unit 31
 * (context/architecture-context.md Part 2) — this only logs and returns.
 */
export async function processAppBuildStub(job: Job<AppBuildStubPayload>) {
  // eslint-disable-next-line no-console
  console.log(
    `[worker] appbuild.stub: tenant ${job.data.tenantId}, build ${job.data.appBuildId} (no-op — real pipeline is Unit 31)`
  );
  return { tenantId: job.data.tenantId, appBuildId: job.data.appBuildId, note: "stub" };
}
