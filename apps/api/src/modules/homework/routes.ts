import { Router } from "express";
import { createHomeworkSchema, listHomeworkQuerySchema, patchHomeworkSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const homeworkRouter = Router();

homeworkRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;

homeworkRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("homework.manage"),
  validateBody(createHomeworkSchema),
  asyncHandler(controller.createHomework)
);

homeworkRouter.get("/", validateQuery(listHomeworkQuerySchema), asyncHandler(controller.listHomework));

homeworkRouter.patch(
  "/:id",
  requirePermission("homework.manage"),
  validateBody(patchHomeworkSchema),
  asyncHandler(controller.patchHomework)
);

homeworkRouter.delete("/:id", requirePermission("homework.manage"), asyncHandler(controller.deleteHomework));
