import { Router } from "express";
import {
  addOnlineExamQuestionFromBankSchema,
  addOnlineExamQuestionSchema,
  createOnlineExamSchema,
  listOnlineExamsQuerySchema,
  submitOnlineExamSchema,
  takeOnlineExamQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const onlineExamsRouter = Router();
onlineExamsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

onlineExamsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("exam.manage"),
  validateBody(createOnlineExamSchema),
  asyncHandler(controller.createOnlineExam)
);

onlineExamsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listOnlineExamsQuerySchema),
  asyncHandler(controller.listOnlineExams)
);

// Self-scoped discovery for the mobile app — no requirePermission (rbac.md
// rule 5), gated by assertOwnStudent() inside the service instead. Registered
// before "/:id/..." routes since Express matches by registration order and
// "/mine" would otherwise be captured as an :id value.
onlineExamsRouter.get(
  "/mine",
  validateQuery(takeOnlineExamQuerySchema),
  asyncHandler(controller.listMyOnlineExams)
);

onlineExamsRouter.patch(
  "/:id/publish",
  requirePermission("exam.manage"),
  asyncHandler(controller.publishOnlineExam)
);

onlineExamsRouter.post(
  "/:id/questions",
  requirePermission("exam.manage"),
  validateBody(addOnlineExamQuestionSchema),
  asyncHandler(controller.addOnlineExamQuestion)
);

onlineExamsRouter.post(
  "/:id/questions/from-bank",
  requirePermission("exam.manage"),
  validateBody(addOnlineExamQuestionFromBankSchema),
  asyncHandler(controller.addOnlineExamQuestionFromBank)
);

onlineExamsRouter.get(
  "/:id/questions",
  requirePermission("exam.manage"),
  asyncHandler(controller.listOnlineExamQuestions)
);

// Self-scoped — no requirePermission (rbac.md rule 5), gated by
// assertOwnStudent()/enrollment check inside the service instead.
onlineExamsRouter.get(
  "/:id/take",
  validateQuery(takeOnlineExamQuerySchema),
  asyncHandler(controller.getOnlineExamForStudent)
);

onlineExamsRouter.post(
  "/:id/submit",
  validateBody(submitOnlineExamSchema),
  asyncHandler(controller.submitOnlineExam)
);

onlineExamsRouter.get(
  "/:id/submissions",
  requirePermission("exam.manage"),
  asyncHandler(controller.listOnlineExamSubmissions)
);
