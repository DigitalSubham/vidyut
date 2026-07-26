import Redis from "ioredis";
import { config } from "./config";

declare global {
  // eslint-disable-next-line no-var
  var __vidyutRedis: Redis | undefined;
}

export const redis = globalThis.__vidyutRedis ?? new Redis(config.redisUrl);

if (process.env.NODE_ENV !== "production") {
  globalThis.__vidyutRedis = redis;
}
