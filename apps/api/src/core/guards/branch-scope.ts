import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import "./types";

/**
 * Enforces branch scoping (context/rbac.md rule 3): OWNER spans every branch
 * of their tenant; other roles are limited to their BranchMembership rows.
 * RLS only enforces tenant isolation, so this check lives in the service
 * layer via this guard, not in Postgres policy.
 *
 * `getBranchId` extracts the target branch from the request (params/query/
 * body, per-route); routes with no single-branch target should not use this
 * guard.
 */
export function requireBranch(getBranchId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const branchId = getBranchId(req);
    if (!branchId) {
      next();
      return;
    }

    const auth = req.auth;
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "auth.errors.missingToken"));
      return;
    }

    if (auth.roles.includes("OWNER") || auth.roles.includes("SUPERADMIN")) {
      next();
      return;
    }

    if (!auth.branchIds.includes(branchId)) {
      next(new AppError("FORBIDDEN", "auth.errors.branchForbidden"));
      return;
    }

    next();
  };
}
