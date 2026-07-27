import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import type { Request, Response } from "express";
import { redis } from "./redis";

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

/**
 * Second stage of the pipeline (context/api-conventions.md), before auth —
 * so it's necessarily IP-keyed here, not per-tenant (tenant isn't known
 * yet). Backed by Redis so limits are shared across API replicas, not
 * per-process. Returns 429 RATE_LIMITED + Retry-After on the standard
 * envelope shape.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: `ratelimit:${options.keyPrefix}:`,
      sendCommand: (...args: string[]) =>
        redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
    }),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: "auth.errors.rateLimited" },
      });
    },
  });
}

/**
 * Default pipeline-wide limiter. Tighter, route-specific limiters (e.g. OTP)
 * can wrap createRateLimiter separately.
 *
 * Unit 32 fix: the Redis-backed store is shared across every test file in a
 * single `vitest run` (same IP, same key), so the real 300/min production
 * limit was tripping as a flaky 429 once the growing test suite's total
 * request count crossed it within the run's ~60s window — a false failure,
 * not a real rate-limit bug. Raised only under NODE_ENV=test (which Vitest
 * sets automatically); production behavior is unchanged.
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: process.env.NODE_ENV === "test" ? 10_000 : 300,
  keyPrefix: "default",
});
