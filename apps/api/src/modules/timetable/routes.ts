import { Router } from "express";
import { bulkUpsertTimetableSchema, listTimetableQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const timetableRouter = Router();

timetableRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;

timetableRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("timetable.manage"),
  validateBody(bulkUpsertTimetableSchema),
  asyncHandler(controller.bulkUpsertTimetable)
);

timetableRouter.get("/", validateQuery(listTimetableQuerySchema), asyncHandler(controller.listTimetable));

timetableRouter.delete(
  "/:id",
  requirePermission("timetable.manage"),
  asyncHandler(controller.deleteTimetablePeriod)
);
