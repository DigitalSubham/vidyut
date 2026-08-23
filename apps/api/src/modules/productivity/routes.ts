import { Router } from "express";
import { createStaffTaskSchema, listStaffTasksQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const productivityRouter = Router();

productivityRouter.use(authGuard, tenantContext, requirePermission("task.manage"));

productivityRouter.post("/staff-tasks", validateBody(createStaffTaskSchema), asyncHandler(controller.createStaffTask));
productivityRouter.get(
  "/staff-tasks",
  validateQuery(listStaffTasksQuerySchema),
  asyncHandler(controller.listStaffTasks)
);
productivityRouter.post("/staff-tasks/:id/complete", asyncHandler(controller.completeStaffTask));
