/**
 * Unit 56 — a minimal in-process rolling counter of 5xx responses, ticked by
 * `structuredLogging` on every request. Feeds `GET /platform/health-summary`
 * without depending on a real log aggregator or the Sentry API (Open
 * Question 3's own recommendation — avoid a second credential dependency).
 * ponytail: per-instance, resets on restart, not persisted — the upgrade if
 * this needs to survive restarts/aggregate across replicas is a real metrics
 * backend, not a bigger version of this counter.
 */
const WINDOW_MS = 15 * 60 * 1000;
let errorTimestamps: number[] = [];

export function recordResponse(statusCode: number): void {
  if (statusCode >= 500) {
    errorTimestamps.push(Date.now());
  }
}

export function getRecentErrorCount(): number {
  const cutoff = Date.now() - WINDOW_MS;
  errorTimestamps = errorTimestamps.filter((t) => t >= cutoff);
  return errorTimestamps.length;
}
