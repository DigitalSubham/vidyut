import type { Request, Response, NextFunction } from "express";

/**
 * Unit 35 — structured request logging. One JSON line per request: request
 * id (Unit 04's existing X-Request-Id middleware), tenant id (read from
 * req.auth once the per-route auth/tenant-context guards have populated it
 * — reliably present by the time the response finishes, even though this
 * middleware itself runs before those guards), route, method, status, and
 * duration. Consistent shape across apps/api and apps/worker (worker logs
 * the same fields per job, see apps/worker/src/logger.ts) so both can be
 * correlated by requestId/tenantId in any log aggregator.
 */
export function structuredLogging(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const entry = {
      level: res.statusCode >= 500 ? "error" : "info",
      requestId: req.requestId,
      tenantId: req.auth?.tenantId ?? req.platformAuth?.platformUserId ?? null,
      method: req.method,
      route: req.route?.path ? `${req.baseUrl}${req.route.path}` : req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  });
  next();
}
