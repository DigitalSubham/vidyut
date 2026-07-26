import type { Request, Response, NextFunction } from "express";
import { prisma } from "@vidyut/db";
import { AppError } from "../errors";
import "./types";

/**
 * Confirms the request carries a tenant context and that the tenant isn't
 * suspended, before branch/RBAC guards run. Actual domain DB access still
 * goes through withTenant() inside each handler/service — this middleware
 * does not open a transaction itself (Express can't cleanly wrap a whole
 * request in one). Tenant itself carries no RLS (platform-level), so this
 * is a direct lookup, not a withTenant() call.
 */
export async function tenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth?.tenantId) {
    next(new AppError("UNAUTHENTICATED", "auth.errors.missingTenant"));
    return;
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.auth.tenantId } });
    if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
      next(new AppError("TENANT_SUSPENDED", "auth.errors.tenantSuspended"));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
