import { Router } from "express";
import {
  createLeaveRequestSchema,
  decideLeaveRequestSchema,
  listLeaveRequestsQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const leaveRouter = Router();

leaveRouter.use(authGuard, tenantContext);

leaveRouter.post(
  "/",
  requirePermission("leave.apply"),
  validateBody(createLeaveRequestSchema),
  asyncHandler(controller.createLeaveRequest)
);

leaveRouter.get(
  "/",
  requirePermission("leave.apply"),
  validateQuery(listLeaveRequestsQuerySchema),
  asyncHandler(controller.listLeaveRequests)
);

leaveRouter.patch(
  "/:id",
  requirePermission("leave.approve"),
  validateBody(decideLeaveRequestSchema),
  asyncHandler(controller.decideLeaveRequest)
);
