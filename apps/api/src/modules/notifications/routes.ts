import { Router } from "express";
import {
  createNotificationTemplateSchema,
  listNotificationsQuerySchema,
  patchNotificationTemplateSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
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

// -- Unit 40: Notification Templates -----------------------------------------

notificationsRouter.post(
  "/templates",
  requirePermission("notification.send"),
  validateBody(createNotificationTemplateSchema),
  asyncHandler(controller.createNotificationTemplate)
);
notificationsRouter.get(
  "/templates",
  requirePermission("notification.send"),
  asyncHandler(controller.listNotificationTemplates)
);
notificationsRouter.patch(
  "/templates/:id",
  requirePermission("notification.send"),
  validateBody(patchNotificationTemplateSchema),
  asyncHandler(controller.patchNotificationTemplate)
);
