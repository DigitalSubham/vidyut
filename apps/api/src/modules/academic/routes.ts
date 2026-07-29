import { Router } from "express";
import {
  addElectiveOptionSchema,
  chooseElectiveSchema,
  createBranchSchema,
  createClassSchema,
  createClassSubjectSchema,
  createElectiveGroupSchema,
  createHouseSchema,
  createSectionSchema,
  createSessionSchema,
  createSubjectSchema,
  createTeacherAssignmentSchema,
  listBranchesQuerySchema,
  listClassesQuerySchema,
  listElectiveGroupsQuerySchema,
  listHousesQuerySchema,
  listSectionsQuerySchema,
  listSessionsQuerySchema,
  listSubjectsQuerySchema,
  listTeacherAssignmentsQuerySchema,
  patchBranchSchema,
  patchClassSchema,
  patchSectionSchema,
  patchSessionSchema,
  patchSubjectSchema,
  rolloverCommitSchema,
  rolloverPreviewSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const academicRouter = Router();

academicRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

// -- Academic sessions -------------------------------------------------------

academicRouter.post(
  "/sessions",
  requireBranch(branchIdFromBody),
  requirePermission("session.manage"),
  validateBody(createSessionSchema),
  asyncHandler(controller.createSession)
);

academicRouter.get(
  "/sessions",
  requireBranch(branchIdFromQuery),
  validateQuery(listSessionsQuerySchema),
  asyncHandler(controller.listSessions)
);

academicRouter.patch(
  "/sessions/:id",
  requirePermission("session.manage"),
  validateBody(patchSessionSchema),
  asyncHandler(controller.patchSession)
);

// -- Classes ------------------------------------------------------------------

academicRouter.post(
  "/classes",
  requireBranch(branchIdFromBody),
  requirePermission("class.manage"),
  validateBody(createClassSchema),
  asyncHandler(controller.createClass)
);

academicRouter.get(
  "/classes",
  requireBranch(branchIdFromQuery),
  validateQuery(listClassesQuerySchema),
  asyncHandler(controller.listClasses)
);

academicRouter.patch(
  "/classes/:id",
  requirePermission("class.manage"),
  validateBody(patchClassSchema),
  asyncHandler(controller.patchClass)
);

academicRouter.delete(
  "/classes/:id",
  requirePermission("class.manage"),
  asyncHandler(controller.deleteClass)
);

// -- Sections (nested under a class; branch scoping resolved via the class) ---

academicRouter.post(
  "/classes/:classId/sections",
  requirePermission("class.manage"),
  validateBody(createSectionSchema),
  asyncHandler(controller.createSection)
);

academicRouter.get(
  "/classes/:classId/sections",
  validateQuery(listSectionsQuerySchema),
  asyncHandler(controller.listSections)
);

academicRouter.patch(
  "/classes/:classId/sections/:id",
  requirePermission("class.manage"),
  validateBody(patchSectionSchema),
  asyncHandler(controller.patchSection)
);

academicRouter.delete(
  "/classes/:classId/sections/:id",
  requirePermission("class.manage"),
  asyncHandler(controller.deleteSection)
);

// -- Subjects -------------------------------------------------------------------

academicRouter.post(
  "/subjects",
  requireBranch(branchIdFromBody),
  requirePermission("subject.manage"),
  validateBody(createSubjectSchema),
  asyncHandler(controller.createSubject)
);

academicRouter.get(
  "/subjects",
  requireBranch(branchIdFromQuery),
  validateQuery(listSubjectsQuerySchema),
  asyncHandler(controller.listSubjects)
);

academicRouter.patch(
  "/subjects/:id",
  requirePermission("subject.manage"),
  validateBody(patchSubjectSchema),
  asyncHandler(controller.patchSubject)
);

academicRouter.delete(
  "/subjects/:id",
  requirePermission("subject.manage"),
  asyncHandler(controller.deleteSubject)
);

// -- Class <-> subject assignment (nested under a class) -----------------------

academicRouter.post(
  "/classes/:classId/subjects",
  requirePermission("class.manage"),
  validateBody(createClassSubjectSchema),
  asyncHandler(controller.createClassSubject)
);

academicRouter.get(
  "/classes/:classId/subjects",
  asyncHandler(controller.listClassSubjects)
);

academicRouter.delete(
  "/classes/:classId/subjects/:subjectId",
  requirePermission("class.manage"),
  asyncHandler(controller.deleteClassSubject)
);

// -- Teacher-subject-section assignment (Unit 09 — deferred by Unit 06) -------

academicRouter.post(
  "/teacher-assignments",
  requirePermission("class.manage"),
  validateBody(createTeacherAssignmentSchema),
  asyncHandler(controller.createTeacherAssignment)
);

academicRouter.get("/teacher-assignments/me", asyncHandler(controller.listMyTeacherAssignments));

academicRouter.get(
  "/teacher-assignments",
  requireBranch(branchIdFromQuery),
  validateQuery(listTeacherAssignmentsQuerySchema),
  asyncHandler(controller.listTeacherAssignments)
);

academicRouter.delete(
  "/teacher-assignments/:id",
  requirePermission("class.manage"),
  asyncHandler(controller.deleteTeacherAssignment)
);

// -- Academic-year rollover (Unit 33) -----------------------------------------

academicRouter.post(
  "/rollover/preview",
  requireBranch(branchIdFromBody),
  requirePermission("session.manage"),
  validateBody(rolloverPreviewSchema),
  asyncHandler(controller.previewRollover)
);

academicRouter.post(
  "/rollover/commit",
  requireBranch(branchIdFromBody),
  requirePermission("session.manage"),
  validateBody(rolloverCommitSchema),
  asyncHandler(controller.commitRollover)
);

// -- Branch management (Unit 36) — closes the `branch.manage` RBAC gap. -----
// No requireBranch on create (there's no existing branchId to check yet);
// branch.manage is OWNER-only per rbac.md's default grid, so requirePermission
// alone is the correct gate.

academicRouter.post(
  "/branches",
  requirePermission("branch.manage"),
  validateBody(createBranchSchema),
  asyncHandler(controller.createBranch)
);

academicRouter.get(
  "/branches",
  validateQuery(listBranchesQuerySchema),
  asyncHandler(controller.listBranches)
);

academicRouter.patch(
  "/branches/:id",
  requirePermission("branch.manage"),
  validateBody(patchBranchSchema),
  asyncHandler(controller.patchBranch)
);

// -- Unit 43: Elective baskets ------------------------------------------------

academicRouter.post(
  "/elective-groups",
  requireBranch(branchIdFromBody),
  requirePermission("class.manage"),
  validateBody(createElectiveGroupSchema),
  asyncHandler(controller.createElectiveGroup)
);

academicRouter.get(
  "/elective-groups",
  validateQuery(listElectiveGroupsQuerySchema),
  asyncHandler(controller.listElectiveGroups)
);

academicRouter.post(
  "/elective-groups/:id/options",
  requirePermission("class.manage"),
  validateBody(addElectiveOptionSchema),
  asyncHandler(controller.addElectiveOption)
);

academicRouter.post(
  "/elective-groups/:id/choice",
  requirePermission("class.manage"),
  validateBody(chooseElectiveSchema),
  asyncHandler(controller.chooseElective)
);

// -- Unit 43: Houses -----------------------------------------------------------

academicRouter.post(
  "/houses",
  requireBranch(branchIdFromBody),
  requirePermission("class.manage"),
  validateBody(createHouseSchema),
  asyncHandler(controller.createHouse)
);

academicRouter.get(
  "/houses",
  requireBranch(branchIdFromQuery),
  validateQuery(listHousesQuerySchema),
  asyncHandler(controller.listHouses)
);

academicRouter.get("/houses/:id/roster", asyncHandler(controller.getHouseRoster));
