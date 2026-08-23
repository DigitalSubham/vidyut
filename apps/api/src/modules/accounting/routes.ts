import { Router } from "express";
import {
  createExpenseHeadSchema,
  createExpenseSchema,
  exportAccountingQuerySchema,
  listExpenseHeadsQuerySchema,
  listExpensesQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const accountingRouter = Router();

accountingRouter.use(authGuard, tenantContext, requirePermission("accounting.manage"));

accountingRouter.post(
  "/expense-heads",
  validateBody(createExpenseHeadSchema),
  asyncHandler(controller.createExpenseHead)
);
accountingRouter.get(
  "/expense-heads",
  validateQuery(listExpenseHeadsQuerySchema),
  asyncHandler(controller.listExpenseHeads)
);

accountingRouter.post("/expenses", validateBody(createExpenseSchema), asyncHandler(controller.createExpense));
accountingRouter.get("/expenses", validateQuery(listExpensesQuerySchema), asyncHandler(controller.listExpenses));

accountingRouter.get(
  "/export/tally",
  validateQuery(exportAccountingQuerySchema),
  asyncHandler(controller.exportAccounting)
);
