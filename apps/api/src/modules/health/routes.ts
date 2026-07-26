import { Router } from "express";
import { prisma } from "@vidyut/db";
import { redis } from "../../core/redis";
import { asyncHandler, ok } from "../../core/envelope";

export const healthRouter = Router();

/** Liveness — process is up. No dependency checks (that's /ready). */
healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    ok(res, { status: "ok" });
  })
);

/** Readiness — can this instance actually serve traffic right now. */
healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([
      prisma
        .$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
      redis
        .ping()
        .then((reply) => reply === "PONG")
        .catch(() => false),
    ]);

    const ready = dbOk && redisOk;
    ok(res, { status: ready ? "ready" : "not_ready", db: dbOk, redis: redisOk }, ready ? 200 : 503);
  })
);
