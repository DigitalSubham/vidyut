import type { Request, Response, NextFunction } from "express";
import { withTenant } from "@vidyut/db";
import type { Permission } from "@vidyut/types";
import { AppError } from "../errors";
import "./types";

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

    if (auth.roles.length === 0) {
      next(new AppError("FORBIDDEN", "auth.errors.missingPermission"));
      return;
    }

    try {
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

      if (!match) {
        next(new AppError("FORBIDDEN", "auth.errors.missingPermission"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
