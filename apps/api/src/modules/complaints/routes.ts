import { Router } from "express";
import { createComplaintSchema, listComplaintsQuerySchema, resolveComplaintSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const complaintsRouter = Router();

complaintsRouter.use(authGuard, tenantContext);

const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

// No requireBranch on create — self-scoped roles have no BranchMembership;
// the service itself verifies the caller can raise in that branch (either
// staff branch access, or one of their own linked students in it).
complaintsRouter.post("/", validateBody(createComplaintSchema), asyncHandler(controller.createComplaint));

complaintsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("engagement.manage"),
  validateQuery(listComplaintsQuerySchema),
  asyncHandler(controller.listComplaints)
);

complaintsRouter.get("/mine", asyncHandler(controller.getMyComplaints));

complaintsRouter.patch(
  "/:id/resolve",
  requirePermission("engagement.manage"),
  validateBody(resolveComplaintSchema),
  asyncHandler(controller.resolveComplaint)
);
