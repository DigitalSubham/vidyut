import { Router } from "express";
import {
  attendanceDefaultersQuerySchema,
  attendanceRegisterQuerySchema,
  listAttendanceQuerySchema,
  markAttendanceSchema,
  regularizeAttendanceSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const attendanceRouter = Router();
attendanceRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

attendanceRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("attendance.mark"),
  validateBody(markAttendanceSchema),
  asyncHandler(controller.markAttendance)
);

attendanceRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("attendance.view"),
  validateQuery(listAttendanceQuerySchema),
  asyncHandler(controller.listAttendance)
);

attendanceRouter.patch(
  "/:id",
  requirePermission("attendance.regularize"),
  validateBody(regularizeAttendanceSchema),
  asyncHandler(controller.regularizeAttendance)
);

attendanceRouter.get(
  "/reports/register",
  requirePermission("attendance.view"),
  validateQuery(attendanceRegisterQuerySchema),
  asyncHandler(controller.getRegister)
);

attendanceRouter.get(
  "/reports/defaulters",
  requireBranch(branchIdFromQuery),
  requirePermission("attendance.view"),
  validateQuery(attendanceDefaultersQuerySchema),
  asyncHandler(controller.getDefaulters)
);
