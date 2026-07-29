import { Router } from "express";
import {
  createHomeworkSchema,
  gradeHomeworkSubmissionSchema,
  listHomeworkQuerySchema,
  patchHomeworkSchema,
  requestHomeworkSubmissionUploadSchema,
} from "@vidyut/validation";
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

// -- Unit 45: submissions + grading -------------------------------------------
// No requirePermission on the upload route — a PARENT/STUDENT caller is
// gated by assertOwnStudent() inside the service instead (rbac.md rule 5:
// self-scoped roles bypass the permission grid entirely).

homeworkRouter.post(
  "/:id/submissions",
  validateBody(requestHomeworkSubmissionUploadSchema),
  asyncHandler(controller.requestHomeworkSubmissionUpload)
);

homeworkRouter.get(
  "/:id/submissions",
  requirePermission("homework.manage"),
  asyncHandler(controller.listHomeworkSubmissions)
);

homeworkRouter.patch(
  "/submissions/:id",
  requirePermission("homework.manage"),
  validateBody(gradeHomeworkSubmissionSchema),
  asyncHandler(controller.gradeHomeworkSubmission)
);
