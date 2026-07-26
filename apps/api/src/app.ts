import express, { type Express } from "express";
import { requestId } from "./core/request-id";
import { security } from "./core/security";
import { defaultRateLimiter } from "./core/rate-limit";
import { errorHandler } from "./core/envelope";
import { docsRouter } from "./core/docs";
import { healthRouter } from "./modules/health/routes";
import { authRouter } from "./modules/auth/routes";
import { jobsRouter } from "./modules/jobs/routes";
import { sampleRouter } from "./modules/sample/routes";
import { platformRouter } from "./modules/platform/routes";

/**
 * Builds the Express app instance. Pipeline order per
 * context/api-conventions.md: X-Request-Id -> rate-limit -> auth ->
 * tenant-context -> branch-scope -> RBAC -> Zod validate -> handler. The
 * first two stages are global (mounted here); the rest are per-route guard
 * chains (see each module's routes.ts) since Express has no clean way to
 * open a per-request transaction/context across an entire router.
 *
 * No app.listen() here — see server.ts. Keeping app construction separate
 * from listening is what let Unit 03 test routes via supertest without a
 * running server, and lets tests here do the same.
 */
export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(...security);
  app.use(express.json());

  // Liveness/readiness/docs are deliberately unauthenticated and unlimited —
  // uptime monitors and the docs UI shouldn't be rate-limited or gated.
  app.use(healthRouter);
  app.use("/api/v1", docsRouter);

  app.use(defaultRateLimiter);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/jobs", jobsRouter);
  app.use("/api/v1/sample", sampleRouter);
  app.use("/api/v1/platform", platformRouter);

  app.use(errorHandler);
  return app;
}
