import { Router } from "express";
import {
  assignFeeStructureSchema,
  createConcessionSchema,
  createFeeAssignmentSchema,
  createFeeHeadSchema,
  createFeeStructureItemSchema,
  createFeeStructureSchema,
  createFineRuleSchema,
  decideConcessionSchema,
  listConcessionsQuerySchema,
  listFeeAssignmentsQuerySchema,
  listFeeHeadsQuerySchema,
  listFeeStructuresQuerySchema,
  patchConcessionSchema,
  patchFeeHeadSchema,
  patchFeeStructureSchema,
  patchFineRuleSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";
import * as paymentsController from "../payments/controller";

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

// -- Fee heads ------------------------------------------------------------------

export const feeHeadsRouter = Router();
feeHeadsRouter.use(authGuard, tenantContext);

feeHeadsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("fee.setup"),
  validateBody(createFeeHeadSchema),
  asyncHandler(controller.createFeeHead)
);
feeHeadsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listFeeHeadsQuerySchema),
  asyncHandler(controller.listFeeHeads)
);
feeHeadsRouter.get("/:id", requirePermission("fee.view"), asyncHandler(controller.getFeeHead));
feeHeadsRouter.patch(
  "/:id",
  requirePermission("fee.setup"),
  validateBody(patchFeeHeadSchema),
  asyncHandler(controller.patchFeeHead)
);
feeHeadsRouter.delete("/:id", requirePermission("fee.setup"), asyncHandler(controller.deleteFeeHead));

// -- Fee structures (+ nested items + fine-rule + assign) ------------------------

export const feeStructuresRouter = Router();
feeStructuresRouter.use(authGuard, tenantContext);

feeStructuresRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("fee.setup"),
  validateBody(createFeeStructureSchema),
  asyncHandler(controller.createFeeStructure)
);
feeStructuresRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listFeeStructuresQuerySchema),
  asyncHandler(controller.listFeeStructures)
);
feeStructuresRouter.get(
  "/:id",
  requirePermission("fee.view"),
  asyncHandler(controller.getFeeStructure)
);
feeStructuresRouter.patch(
  "/:id",
  requirePermission("fee.setup"),
  validateBody(patchFeeStructureSchema),
  asyncHandler(controller.patchFeeStructure)
);
feeStructuresRouter.delete(
  "/:id",
  requirePermission("fee.setup"),
  asyncHandler(controller.deleteFeeStructure)
);

feeStructuresRouter.post(
  "/:structureId/items",
  requirePermission("fee.setup"),
  validateBody(createFeeStructureItemSchema),
  asyncHandler(controller.createFeeStructureItem)
);
feeStructuresRouter.get(
  "/:structureId/items",
  requirePermission("fee.view"),
  asyncHandler(controller.listFeeStructureItems)
);
feeStructuresRouter.delete(
  "/:structureId/items/:itemId",
  requirePermission("fee.setup"),
  asyncHandler(controller.deleteFeeStructureItem)
);

feeStructuresRouter.post(
  "/:structureId/items/:itemId/fine-rule",
  requirePermission("fee.setup"),
  validateBody(createFineRuleSchema),
  asyncHandler(controller.createFineRule)
);
feeStructuresRouter.patch(
  "/:structureId/items/:itemId/fine-rule",
  requirePermission("fee.setup"),
  validateBody(patchFineRuleSchema),
  asyncHandler(controller.patchFineRule)
);
feeStructuresRouter.delete(
  "/:structureId/items/:itemId/fine-rule",
  requirePermission("fee.setup"),
  asyncHandler(controller.deleteFineRule)
);

feeStructuresRouter.post(
  "/:id/assign",
  requirePermission("fee.setup"),
  validateBody(assignFeeStructureSchema),
  asyncHandler(controller.assignFeeStructureToClass)
);

// Unit 12 — invoice generation lives on this same resource.
feeStructuresRouter.post(
  "/:id/generate-invoices",
  requirePermission("fee.setup"),
  asyncHandler(paymentsController.generateInvoices)
);

// -- Fee assignments (individual assign/unassign) --------------------------------

export const feeAssignmentsRouter = Router();
feeAssignmentsRouter.use(authGuard, tenantContext);

feeAssignmentsRouter.post(
  "/",
  requirePermission("fee.setup"),
  validateBody(createFeeAssignmentSchema),
  asyncHandler(controller.createFeeAssignment)
);
feeAssignmentsRouter.get(
  "/",
  requirePermission("fee.view"),
  validateQuery(listFeeAssignmentsQuerySchema),
  asyncHandler(controller.listFeeAssignments)
);
feeAssignmentsRouter.delete(
  "/:id",
  requirePermission("fee.setup"),
  asyncHandler(controller.deleteFeeAssignment)
);

// -- Concessions (apply -> approve/reject) ---------------------------------------

export const concessionsRouter = Router();
concessionsRouter.use(authGuard, tenantContext);

concessionsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("fee.setup"),
  validateBody(createConcessionSchema),
  asyncHandler(controller.createConcession)
);
concessionsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listConcessionsQuerySchema),
  asyncHandler(controller.listConcessions)
);
concessionsRouter.get(
  "/:id",
  requirePermission("fee.view"),
  asyncHandler(controller.getConcession)
);
concessionsRouter.patch(
  "/:id",
  requirePermission("fee.setup"),
  validateBody(patchConcessionSchema),
  asyncHandler(controller.patchConcession)
);
concessionsRouter.patch(
  "/:id/decide",
  requirePermission("fee.concession.approve"),
  validateBody(decideConcessionSchema),
  asyncHandler(controller.decideConcession)
);
