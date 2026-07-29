import { Router } from "express";
import { createQuestionBankItemSchema, listQuestionBankQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const questionBankRouter = Router();
questionBankRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

questionBankRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("exam.manage"),
  validateBody(createQuestionBankItemSchema),
  asyncHandler(controller.createQuestionBankItem)
);

questionBankRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listQuestionBankQuerySchema),
  asyncHandler(controller.listQuestionBankItems)
);
