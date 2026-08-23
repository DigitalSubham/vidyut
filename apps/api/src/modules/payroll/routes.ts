import { Router } from "express";
import { exportPayrollQuerySchema, listSalaryStructuresQuerySchema, upsertSalaryStructureSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const payrollRouter = Router();

payrollRouter.use(authGuard, tenantContext, requirePermission("payroll.manage"));

payrollRouter.post(
  "/salary-structures",
  validateBody(upsertSalaryStructureSchema),
  asyncHandler(controller.upsertSalaryStructure)
);
payrollRouter.get(
  "/salary-structures",
  validateQuery(listSalaryStructuresQuerySchema),
  asyncHandler(controller.listSalaryStructures)
);

payrollRouter.get("/export", validateQuery(exportPayrollQuerySchema), asyncHandler(controller.exportPayroll));
