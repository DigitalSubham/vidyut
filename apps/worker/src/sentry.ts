import * as Sentry from "@sentry/node";

/** Unit 35 — same optional, DSN-gated Sentry setup as apps/api (see apps/api/src/core/sentry.ts). */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "development", tracesSampleRate: 0 });
}

export function captureJobError(err: unknown, context: { jobName: string; jobId?: string }): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  Sentry.withScope((scope) => {
    scope.setTag("jobName", context.jobName);
    if (context.jobId) scope.setTag("jobId", context.jobId);
    Sentry.captureException(err);
  });
}
