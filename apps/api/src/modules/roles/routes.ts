import { Router } from "express";
import { createRoleSchema, patchRolePermissionsSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody } from "../../core/guards/validate";
import * as controller from "./controller";

export const rolesRouter = Router();

rolesRouter.use(authGuard, tenantContext);

rolesRouter.post(
  "/",
  requirePermission("role.manage"),
  validateBody(createRoleSchema),
  asyncHandler(controller.createRole)
);

rolesRouter.get("/", requirePermission("role.manage"), asyncHandler(controller.listRoles));

rolesRouter.patch(
  "/:id/permissions",
  requirePermission("role.manage"),
  validateBody(patchRolePermissionsSchema),
  asyncHandler(controller.patchRolePermissions)
);
