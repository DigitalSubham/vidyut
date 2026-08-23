import { Router } from "express";
import {
  createStudentSchema,
  createTimelineEntrySchema,
  importStudentsSchema,
  linkSiblingsSchema,
  listAlumniQuerySchema,
  listStudentsQuerySchema,
  patchStudentSchema,
  readmitStudentSchema,
  requestImportUploadSchema,
  transferStudentSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const studentsRouter = Router();

studentsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

studentsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("student.edit"),
  validateBody(createStudentSchema),
  asyncHandler(controller.createStudent)
);

studentsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  requirePermission("student.view"),
  validateQuery(listStudentsQuerySchema),
  asyncHandler(controller.listStudents)
);

studentsRouter.post(
  "/import/upload-url",
  requireBranch(branchIdFromBody),
  requirePermission("student.import"),
  validateBody(requestImportUploadSchema),
  asyncHandler(controller.requestImportUpload)
);

studentsRouter.post(
  "/import",
  requireBranch(branchIdFromBody),
  requirePermission("student.import"),
  validateBody(importStudentsSchema),
  asyncHandler(controller.importStudents)
);

studentsRouter.get(
  "/alumni",
  requirePermission("student.view"),
  validateQuery(listAlumniQuerySchema),
  asyncHandler(controller.listAlumni)
);

studentsRouter.post(
  "/link-siblings",
  requirePermission("student.edit"),
  validateBody(linkSiblingsSchema),
  asyncHandler(controller.linkSiblings)
);

studentsRouter.get("/:id", requirePermission("student.view"), asyncHandler(controller.getStudent));

studentsRouter.get("/:id/siblings", requirePermission("student.view"), asyncHandler(controller.listSiblings));

studentsRouter.post(
  "/:id/transfer",
  requirePermission("student.edit"),
  validateBody(transferStudentSchema),
  asyncHandler(controller.transferStudent)
);

studentsRouter.post("/:id/mark-alumni", requirePermission("student.edit"), asyncHandler(controller.markAlumni));

studentsRouter.post(
  "/:id/readmit",
  requirePermission("student.edit"),
  validateBody(readmitStudentSchema),
  asyncHandler(controller.readmitStudent)
);

studentsRouter.post(
  "/:id/timeline",
  requirePermission("student.edit"),
  validateBody(createTimelineEntrySchema),
  asyncHandler(controller.createTimelineEntry)
);

studentsRouter.get(
  "/:id/timeline",
  requirePermission("student.view"),
  asyncHandler(controller.listTimelineEntries)
);

studentsRouter.get(
  "/:id/transcript",
  requirePermission("student.view"),
  asyncHandler(controller.getStudentTranscript)
);

studentsRouter.patch(
  "/:id",
  requirePermission("student.edit"),
  validateBody(patchStudentSchema),
  asyncHandler(controller.patchStudent)
);

studentsRouter.delete(
  "/:id",
  requirePermission("student.delete"),
  asyncHandler(controller.deleteStudent)
);
