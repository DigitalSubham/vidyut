import { Router } from "express";
import { createCircularSchema, listCircularsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const circularsRouter = Router();

circularsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

circularsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("engagement.manage"),
  validateBody(createCircularSchema),
  asyncHandler(controller.createCircular)
);

circularsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listCircularsQuerySchema),
  asyncHandler(controller.listCirculars)
);

// Registered before "/:id/acks" would otherwise collide with nothing here,
// but kept explicit — ack is open to any authenticated user (self-scoped
// roles included), acks-list is staff-only.
circularsRouter.post("/:id/ack", asyncHandler(controller.ackCircular));

circularsRouter.get(
  "/:id/acks",
  requirePermission("engagement.manage"),
  asyncHandler(controller.listCircularAcks)
);
