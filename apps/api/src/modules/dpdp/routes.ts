import { Router } from "express";
import { rejectDataDeletionRequestSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody } from "../../core/guards/validate";
import * as controller from "./controller";

/** Mounted at /api/v1/data-deletion-requests — OWNER review/execute (Unit 39, DPDP). */
export const dataDeletionRequestsRouter = Router();

dataDeletionRequestsRouter.use(authGuard, tenantContext);

dataDeletionRequestsRouter.get(
  "/",
  requirePermission("settings.manage"),
  asyncHandler(controller.listDataDeletionRequests)
);

dataDeletionRequestsRouter.patch(
  "/:id/reject",
  requirePermission("settings.manage"),
  validateBody(rejectDataDeletionRequestSchema),
  asyncHandler(controller.rejectDataDeletionRequest)
);

// Additionally requires the OWNER role specifically (checked in the
// service) — the one destructive action in this pipeline.
dataDeletionRequestsRouter.post(
  "/:id/execute",
  requirePermission("settings.manage"),
  asyncHandler(controller.executeDataDeletionRequest)
);
