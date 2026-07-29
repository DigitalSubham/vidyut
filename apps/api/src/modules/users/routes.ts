import { Router } from "express";
import { inviteUserSchema, listUsersQuerySchema, patchUserSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const usersRouter = Router();

usersRouter.use(authGuard, tenantContext);

usersRouter.post(
  "/invite",
  requirePermission("user.manage"),
  validateBody(inviteUserSchema),
  asyncHandler(controller.inviteUser)
);

usersRouter.get(
  "/",
  requirePermission("user.manage"),
  validateQuery(listUsersQuerySchema),
  asyncHandler(controller.listUsers)
);

usersRouter.patch(
  "/:id",
  requirePermission("user.manage"),
  validateBody(patchUserSchema),
  asyncHandler(controller.patchUser)
);
