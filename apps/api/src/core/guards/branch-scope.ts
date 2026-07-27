import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import type { RequestAuth } from "./types";
import "./types";

/** OWNER/SUPERADMIN span every branch of their tenant; others need a matching BranchMembership. */
export function branchAccessAllowed(auth: RequestAuth, branchId: string): boolean {
  return auth.roles.includes("OWNER") || auth.roles.includes("SUPERADMIN") || auth.branchIds.includes(branchId);
}

/**
 * Enforces branch scoping (context/rbac.md rule 3): OWNER spans every branch
 * of their tenant; other roles are limited to their BranchMembership rows.
 * RLS only enforces tenant isolation, so this check lives in the service
 * layer via this guard, not in Postgres policy.
 *
 * `getBranchId` extracts the target branch from the request (params/query/
 * body, per-route); routes with no single-branch target should not use this
 * guard. For routes where the branch is only known after fetching the
 * record (e.g. PATCH /resource/:id with no branchId in the URL), call
 * `branchAccessAllowed` directly in the service instead.
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

    if (!branchAccessAllowed(auth, branchId)) {
      next(new AppError("FORBIDDEN", "auth.errors.branchForbidden"));
      return;
    }

    next();
  };
}
