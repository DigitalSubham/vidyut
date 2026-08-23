import { Router } from "express";
import { createNewsletterSchema, listNewslettersQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const newslettersRouter = Router();

newslettersRouter.use(authGuard, tenantContext, requirePermission("announcement.send"));

newslettersRouter.post("/", validateBody(createNewsletterSchema), asyncHandler(controller.createNewsletter));
newslettersRouter.get("/", validateQuery(listNewslettersQuerySchema), asyncHandler(controller.listNewsletters));
