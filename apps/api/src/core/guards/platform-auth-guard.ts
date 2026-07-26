import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { verifyPlatformAccessToken } from "../auth/platform-jwt";

export interface PlatformRequestAuth {
  platformUserId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      platformAuth?: PlatformRequestAuth;
    }
  }
}

/**
 * Verifies a platform (super-admin) access token — entirely separate from
 * authGuard/tenant auth. Never sets req.auth or touches tenantId; platform
 * routes never go through withTenant() for their own identity (context/rbac.md).
 */
export async function platformAuthGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError("UNAUTHENTICATED", "platform.errors.missingToken"));
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const claims = await verifyPlatformAccessToken(token);
    req.platformAuth = { platformUserId: claims.sub };
    next();
  } catch {
    next(new AppError("UNAUTHENTICATED", "platform.errors.invalidToken"));
  }
}
