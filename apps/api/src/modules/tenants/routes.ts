import { Router } from "express";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import * as controller from "./controller";

/** Mounted at /api/v1/tenants — public (no authGuard: this is how a client resolves *which* tenant to authenticate against). */
export const tenantsRouter = Router();

tenantsRouter.get("/resolve/:schoolCode", asyncHandler(controller.resolveSchoolCode));

/**
 * Unit 34's RBAC coverage check found `subscription.view` (rbac.md's matrix,
 * OWNER-only) documented but never enforced anywhere — no tenant-facing
 * "view my subscription" endpoint existed at all. Closes that real gap.
 */
tenantsRouter.get(
  "/me/subscription",
  authGuard,
  tenantContext,
  requirePermission("subscription.view"),
  asyncHandler(controller.getMySubscription)
);
