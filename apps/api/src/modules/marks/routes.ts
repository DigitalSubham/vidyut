import { Router } from "express";
import { bulkEnterMarksSchema, listMarksQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const marksRouter = Router();

marksRouter.use(authGuard, tenantContext);

marksRouter.post(
  "/",
  requirePermission("marks.enter"),
  validateBody(bulkEnterMarksSchema),
  asyncHandler(controller.bulkEnterMarks)
);

marksRouter.get("/", validateQuery(listMarksQuerySchema), asyncHandler(controller.listMarks));

marksRouter.patch("/:id/lock", requirePermission("marks.moderate"), asyncHandler(controller.lockMarksEntry));
