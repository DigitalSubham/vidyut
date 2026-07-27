import { Router } from "express";
import { dashboardSummaryQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const dashboardRouter = Router();

dashboardRouter.use(authGuard, tenantContext);

dashboardRouter.get(
  "/summary",
  validateQuery(dashboardSummaryQuerySchema),
  asyncHandler(controller.getDashboardSummary)
);
