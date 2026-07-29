import { Router } from "express";
import {
  createStaffSchema,
  listStaffAttendanceQuerySchema,
  listStaffQuerySchema,
  markStaffAttendanceSchema,
  patchStaffSchema,
  requestStaffDocumentUploadSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const staffRouter = Router();

staffRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

staffRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("staff.manage"),
  validateBody(createStaffSchema),
  asyncHandler(controller.createStaff)
);

// Reads are broad (any authenticated staff role) — matching the feature
// catalog's "staff directory" note, not gated by staff.manage.
staffRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listStaffQuerySchema),
  asyncHandler(controller.listStaff)
);

// -- Unit 42: Staff HR Depth --------------------------------------------------
// Registered before the "/:id" routes below — Express matches in
// registration order, and "/:id" would otherwise swallow "/attendance".

staffRouter.post(
  "/attendance",
  requireBranch(branchIdFromBody),
  requirePermission("attendance.mark"),
  validateBody(markStaffAttendanceSchema),
  asyncHandler(controller.markStaffAttendance)
);

staffRouter.get(
  "/attendance",
  requireBranch(branchIdFromQuery),
  requirePermission("attendance.view"),
  validateQuery(listStaffAttendanceQuerySchema),
  asyncHandler(controller.listStaffAttendance)
);

staffRouter.get("/:id", asyncHandler(controller.getStaff));

staffRouter.patch(
  "/:id",
  requirePermission("staff.manage"),
  validateBody(patchStaffSchema),
  asyncHandler(controller.patchStaff)
);

staffRouter.post(
  "/:id/documents",
  requirePermission("staff.manage"),
  validateBody(requestStaffDocumentUploadSchema),
  asyncHandler(controller.requestStaffDocumentUpload)
);
