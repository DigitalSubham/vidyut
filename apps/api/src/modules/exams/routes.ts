import { Router } from "express";
import {
  createExamSchema,
  createExamSubjectSchema,
  listExamsQuerySchema,
  patchExamSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const examsRouter = Router();

examsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

examsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("exam.manage"),
  validateBody(createExamSchema),
  asyncHandler(controller.createExam)
);

examsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listExamsQuerySchema),
  asyncHandler(controller.listExams)
);

examsRouter.patch(
  "/:id",
  requirePermission("exam.manage"),
  validateBody(patchExamSchema),
  asyncHandler(controller.patchExam)
);

examsRouter.delete("/:id", requirePermission("exam.manage"), asyncHandler(controller.deleteExam));

examsRouter.post(
  "/:examId/subjects",
  requirePermission("exam.manage"),
  validateBody(createExamSubjectSchema),
  asyncHandler(controller.createExamSubject)
);

examsRouter.get("/:examId/subjects", asyncHandler(controller.listExamSubjects));

examsRouter.delete(
  "/:examId/subjects/:id",
  requirePermission("exam.manage"),
  asyncHandler(controller.deleteExamSubject)
);
