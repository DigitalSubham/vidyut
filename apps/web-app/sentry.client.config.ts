import * as Sentry from "@sentry/nextjs";

// Unit 35 — gated on NEXT_PUBLIC_SENTRY_DSN; a no-op build when unset, same
// posture as apps/api/apps/worker's SENTRY_DSN-gated init.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
  });
}
