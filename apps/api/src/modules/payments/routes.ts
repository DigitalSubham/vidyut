import { Router } from "express";
import {
  createOpeningBalanceSchema,
  createPaymentSchema,
  createRefundRequestSchema,
  feeReportsQuerySchema,
  initiateOnlinePaymentSchema,
  listInvoicesQuerySchema,
  listPaymentsQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";
import * as onlinePaymentsController from "../online-payments/controller";

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

// -- Invoices ---------------------------------------------------------------

export const invoicesRouter = Router();
invoicesRouter.use(authGuard, tenantContext);

invoicesRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listInvoicesQuerySchema),
  asyncHandler(controller.listInvoices)
);
invoicesRouter.get("/:id", requirePermission("fee.view"), asyncHandler(controller.getInvoice));

// -- Payments -----------------------------------------------------------------

export const paymentsRouter = Router();
paymentsRouter.use(authGuard, tenantContext);

paymentsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("fees.collect"),
  validateBody(createPaymentSchema),
  asyncHandler(controller.createPayment)
);
paymentsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.view"),
  validateQuery(listPaymentsQuerySchema),
  asyncHandler(controller.listPayments)
);

// Unit 13 — online payment initiation. Gating is a mix of self-scope (PARENT,
// who has no BranchMembership so requireBranch can't apply) and staff branch
// scope + permission, all checked inside the service.
paymentsRouter.post(
  "/online/initiate",
  validateBody(initiateOnlinePaymentSchema),
  asyncHandler(onlinePaymentsController.initiateOnlinePayment)
);

paymentsRouter.post(
  "/:id/refund-request",
  requirePermission("fee.refund"),
  validateBody(createRefundRequestSchema),
  asyncHandler(onlinePaymentsController.createRefundRequest)
);

// -- Fee reports ----------------------------------------------------------------

export const feeReportsRouter = Router();
feeReportsRouter.use(authGuard, tenantContext);

feeReportsRouter.get(
  "/dues",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.reports"),
  validateQuery(feeReportsQuerySchema),
  asyncHandler(controller.getDuesReport)
);
feeReportsRouter.get(
  "/defaulters",
  requireBranch(branchIdFromQuery),
  requirePermission("fee.reports"),
  validateQuery(feeReportsQuerySchema),
  asyncHandler(controller.getDefaultersReport)
);

// -- Student fee ledger + opening balance (mounted under /students) -----------

export const studentFeeLedgerRouter = Router();
studentFeeLedgerRouter.use(authGuard, tenantContext);

studentFeeLedgerRouter.get(
  "/:id/fee-ledger",
  requirePermission("fee.view"),
  asyncHandler(controller.getStudentFeeLedger)
);

studentFeeLedgerRouter.post(
  "/:id/opening-balance",
  requirePermission("fee.setup"),
  validateBody(createOpeningBalanceSchema),
  asyncHandler(controller.createOpeningBalance)
);
