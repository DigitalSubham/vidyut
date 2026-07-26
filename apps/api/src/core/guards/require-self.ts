import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import "./types";

/**
 * PARENT/STUDENT bypass the permission grid entirely (context/rbac.md rule
 * 5) — they may only touch their own record. `getOwnerUserId` extracts the
 * userId that owns the target resource (e.g. from a loaded Student's linked
 * guardian/user). Richer self-scope (a parent's linked children via
 * Guardian/StudentGuardian) is added once those models exist (Unit 08); for
 * now this only covers the direct self-userId case.
 */
export function requireSelf(getOwnerUserId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "auth.errors.missingToken"));
      return;
    }

    const isSelfScopedRole = auth.roles.includes("PARENT") || auth.roles.includes("STUDENT");
    if (!isSelfScopedRole) {
      // Staff/owner roles are gated by requirePermission() instead.
      next();
      return;
    }

    const ownerUserId = getOwnerUserId(req);
    if (ownerUserId !== auth.userId) {
      next(new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden"));
      return;
    }

    next();
  };
}
