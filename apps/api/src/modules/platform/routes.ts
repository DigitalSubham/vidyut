import { Router } from "express";
import {
  createTenantSchema,
  impersonateSchema,
  listTenantsQuerySchema,
  patchTenantSchema,
  platformLoginSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { validateBody, validateQuery } from "../../core/guards/validate";
import { platformAuthGuard } from "../../core/guards/platform-auth-guard";
import * as controller from "./controller";

export const platformRouter = Router();

platformRouter.post(
  "/auth/login",
  validateBody(platformLoginSchema),
  asyncHandler(controller.login)
);

platformRouter.post(
  "/tenants",
  platformAuthGuard,
  validateBody(createTenantSchema),
  asyncHandler(controller.createTenant)
);

platformRouter.get(
  "/tenants",
  platformAuthGuard,
  validateQuery(listTenantsQuerySchema),
  asyncHandler(controller.listTenants)
);

platformRouter.get("/tenants/:id", platformAuthGuard, asyncHandler(controller.getTenant));

platformRouter.patch(
  "/tenants/:id",
  platformAuthGuard,
  validateBody(patchTenantSchema),
  asyncHandler(controller.patchTenant)
);

platformRouter.get(
  "/tenants/:id/usage",
  platformAuthGuard,
  asyncHandler(controller.getTenantUsage)
);

platformRouter.post(
  "/tenants/:id/impersonate",
  platformAuthGuard,
  validateBody(impersonateSchema),
  asyncHandler(controller.impersonate)
);
