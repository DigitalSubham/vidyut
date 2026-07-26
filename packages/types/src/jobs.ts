/** Shared between apps/api (producer) and apps/worker (consumer) — context/code-standards.md. */
export const QUEUE_NAME = "vidyut-jobs";

export const JOB_NAMES = ["demo.ping", "appbuild.stub"] as const;
export type JobName = (typeof JOB_NAMES)[number];

export interface DemoPingPayload {
  message: string;
}

/** Real EAS build pipeline is Unit 31 — this just proves the plumbing (context/feature-specs/05-superadmin-tenants-plans.md). */
export interface AppBuildStubPayload {
  tenantId: string;
  appBuildId: string;
}

export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";

export interface JobStatus {
  id: string;
  name: string;
  state: JobState;
  returnValue?: unknown;
  failedReason?: string;
}
