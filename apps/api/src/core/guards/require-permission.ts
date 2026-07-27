import type { Request, Response, NextFunction } from "express";
import { withTenant } from "@vidyut/db";
import type { Permission } from "@vidyut/types";
import { AppError } from "../errors";
import type { RequestAuth } from "./types";
import "./types";

/** Standalone check reusable outside the middleware (e.g. an "either self-scope or this permission" route). */
export async function userHasPermission(auth: RequestAuth, permission: Permission): Promise<boolean> {
  if (auth.roles.length === 0) {
    return false;
  }
  const match = await withTenant(auth.tenantId, (tx) =>
    tx.role.findFirst({
      where: {
        tenantId: auth.tenantId,
        key: { in: auth.roles },
        rolePermissions: { some: { permissionKey: permission } },
      },
      select: { id: true },
    })
  );
  return match != null;
}

/**
 * Checks permissions fresh from the DB on every request (never cached in
 * the JWT) so an owner editing role permissions takes effect immediately,
 * not after the access token expires. context/rbac.md rule 1: checked after
 * auth + tenant + branch scope.
 */
export function requirePermission(permission: Permission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "auth.errors.missingToken"));
      return;
    }

    try {
      const allowed = await userHasPermission(auth, permission);
      if (!allowed) {
        next(new AppError("FORBIDDEN", "auth.errors.missingPermission"));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
