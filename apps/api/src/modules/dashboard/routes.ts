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
/** Unit 69 scope #6 — self-scoped by the caller's own Staff row, no branch/permission gate beyond having a Staff profile at all. */
dashboardRouter.get("/teacher-summary", asyncHandler(controller.getTeacherSummary));
dashboardRouter.get("/accountant-summary", asyncHandler(controller.getAccountantSummary));
