import { Router } from "express";
import { createCalendarEventSchema, listCalendarEventsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const calendarRouter = Router();

calendarRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

calendarRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("engagement.manage"),
  validateBody(createCalendarEventSchema),
  asyncHandler(controller.createCalendarEvent)
);

calendarRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listCalendarEventsQuerySchema),
  asyncHandler(controller.listCalendarEvents)
);
