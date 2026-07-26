import cors from "cors";
import helmet from "helmet";
import type { RequestHandler } from "express";

function parseAllowList(): string[] {
  const raw = process.env.CORS_ALLOW_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const security: RequestHandler[] = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      const allowList = parseAllowList();
      // No Origin header (server-to-server, curl, health checks) is always allowed.
      if (!origin || allowList.length === 0 || allowList.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
];
