import { Router } from "express";
import {
  createReportCardTemplateSchema,
  generateReportCardsSchema,
  listReportCardTemplatesQuerySchema,
  listReportCardsQuerySchema,
  patchReportCardTemplateSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const reportCardTemplatesRouter = Router();
reportCardTemplatesRouter.use(authGuard, tenantContext);

reportCardTemplatesRouter.post(
  "/",
  requirePermission("reportcard.generate"),
  validateBody(createReportCardTemplateSchema),
  asyncHandler(controller.createTemplate)
);
reportCardTemplatesRouter.get(
  "/",
  validateQuery(listReportCardTemplatesQuerySchema),
  asyncHandler(controller.listTemplates)
);
reportCardTemplatesRouter.patch(
  "/:id",
  requirePermission("reportcard.generate"),
  validateBody(patchReportCardTemplateSchema),
  asyncHandler(controller.patchTemplate)
);
reportCardTemplatesRouter.delete(
  "/:id",
  requirePermission("reportcard.generate"),
  asyncHandler(controller.deleteTemplate)
);

export const reportCardsRouter = Router();
reportCardsRouter.use(authGuard, tenantContext);

reportCardsRouter.post(
  "/generate",
  requirePermission("reportcard.generate"),
  validateBody(generateReportCardsSchema),
  asyncHandler(controller.generateReportCards)
);
reportCardsRouter.get("/", validateQuery(listReportCardsQuerySchema), asyncHandler(controller.listReportCards));
reportCardsRouter.patch(
  "/:id/publish",
  requirePermission("reportcard.publish"),
  asyncHandler(controller.publishReportCard)
);
