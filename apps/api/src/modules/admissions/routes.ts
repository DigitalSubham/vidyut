import { Router } from "express";
import {
  convertApplicationSchema,
  createApplicationSchema,
  createEnquirySchema,
  listApplicationsQuerySchema,
  listEnquiriesQuerySchema,
  patchApplicationSchema,
  patchEnquirySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const enquiriesRouter = Router();
export const applicationsRouter = Router();

enquiriesRouter.use(authGuard, tenantContext);
applicationsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

// -- Enquiries ----------------------------------------------------------------

enquiriesRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("admission.manage"),
  validateBody(createEnquirySchema),
  asyncHandler(controller.createEnquiry)
);

enquiriesRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("admission.manage"),
  validateQuery(listEnquiriesQuerySchema),
  asyncHandler(controller.listEnquiries)
);

enquiriesRouter.get(
  "/:id",
  requirePermission("admission.manage"),
  asyncHandler(controller.getEnquiry)
);

enquiriesRouter.patch(
  "/:id",
  requirePermission("admission.manage"),
  validateBody(patchEnquirySchema),
  asyncHandler(controller.patchEnquiry)
);

// -- Applications ---------------------------------------------------------------

applicationsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("admission.manage"),
  validateBody(createApplicationSchema),
  asyncHandler(controller.createApplication)
);

applicationsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("admission.manage"),
  validateQuery(listApplicationsQuerySchema),
  asyncHandler(controller.listApplications)
);

applicationsRouter.get(
  "/:id",
  requirePermission("admission.manage"),
  asyncHandler(controller.getApplication)
);

applicationsRouter.patch(
  "/:id",
  requirePermission("admission.manage"),
  validateBody(patchApplicationSchema),
  asyncHandler(controller.patchApplication)
);

applicationsRouter.post(
  "/:id/convert",
  requirePermission("admission.manage"),
  validateBody(convertApplicationSchema),
  asyncHandler(controller.convertApplication)
);
