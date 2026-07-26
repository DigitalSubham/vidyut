import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { verifyAccessToken } from "../auth/jwt";
import "./types";

/** Verifies the access JWT and attaches req.auth. First stage of the request pipeline. */
export async function authGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError("UNAUTHENTICATED", "auth.errors.missingToken"));
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const claims = await verifyAccessToken(token);
    req.auth = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      roles: claims.roles,
      branchIds: claims.branchIds,
    };
    next();
  } catch {
    next(new AppError("UNAUTHENTICATED", "auth.errors.invalidToken"));
  }
}
