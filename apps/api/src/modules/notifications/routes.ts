import { Router } from "express";
import { listNotificationsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

/** Mounted at /api/v1/fees/reminders. */
export const feeRemindersRouter = Router();
feeRemindersRouter.use(authGuard, tenantContext);

feeRemindersRouter.post("/run", requirePermission("notification.send"), asyncHandler(controller.runReminderScan));

/** Mounted at /api/v1/notifications. */
export const notificationsRouter = Router();
notificationsRouter.use(authGuard, tenantContext);

notificationsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listNotificationsQuerySchema),
  asyncHandler(controller.listNotifications)
);
