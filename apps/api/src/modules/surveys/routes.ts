import { Router } from "express";
import { createSurveySchema, listSurveysQuerySchema, respondSurveySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const surveysRouter = Router();

surveysRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

surveysRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("engagement.manage"),
  validateBody(createSurveySchema),
  asyncHandler(controller.createSurvey)
);

surveysRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listSurveysQuerySchema),
  asyncHandler(controller.listSurveys)
);

surveysRouter.post("/:id/respond", validateBody(respondSurveySchema), asyncHandler(controller.respondSurvey));

surveysRouter.get(
  "/:id/results",
  requirePermission("engagement.manage"),
  asyncHandler(controller.getSurveyResults)
);
