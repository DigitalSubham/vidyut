import * as Sentry from "@sentry/node";

/**
 * Unit 35 — error reporting. Gated on SENTRY_DSN being set (not required in
 * dev/test, same optional-integration posture as this codebase's other
 * external services, e.g. Razorpay). `initSentry()` must be called before
 * any other app code that might throw, per Sentry's own setup guidance.
 *
 * Tenant-tagged, never cross-tenant-leaky (architecture-context.md's own
 * observability note): only `tenantId` is attached as a Sentry tag — never
 * student/guardian names, phone numbers, or other tenant content that could
 * leak into a shared Sentry project's issue titles/breadcrumbs.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "development", tracesSampleRate: 0 });
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

/** Captures an unexpected error with request/tenant context, if Sentry is configured — a no-op otherwise. */
export function captureError(err: unknown, context: { requestId?: string; tenantId?: string | null }): void {
  if (!isSentryEnabled()) {
    return;
  }
  Sentry.withScope((scope) => {
    if (context.requestId) scope.setTag("requestId", context.requestId);
    if (context.tenantId) scope.setTag("tenantId", context.tenantId);
    Sentry.captureException(err);
  });
}
