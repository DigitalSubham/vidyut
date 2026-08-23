import { Router } from "express";
import {
  createContentItemSchema,
  createLessonPlanSchema,
  createLiveClassLinkSchema,
  createSyllabusChapterSchema,
  listContentItemsQuerySchema,
  listLessonPlansQuerySchema,
  listLiveClassLinksQuerySchema,
  listSyllabusChaptersQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const lmsRouter = Router();

lmsRouter.use(authGuard, tenantContext, requirePermission("lms.manage"));

lmsRouter.post(
  "/syllabus-chapters",
  validateBody(createSyllabusChapterSchema),
  asyncHandler(controller.createSyllabusChapter)
);
lmsRouter.get(
  "/syllabus-chapters",
  validateQuery(listSyllabusChaptersQuerySchema),
  asyncHandler(controller.listSyllabusChapters)
);
lmsRouter.post(
  "/syllabus-chapters/:id/complete",
  asyncHandler(controller.markSyllabusChapterComplete)
);

lmsRouter.post("/lesson-plans", validateBody(createLessonPlanSchema), asyncHandler(controller.createLessonPlan));
lmsRouter.get("/lesson-plans", validateQuery(listLessonPlansQuerySchema), asyncHandler(controller.listLessonPlans));

lmsRouter.post("/content-items", validateBody(createContentItemSchema), asyncHandler(controller.createContentItem));
lmsRouter.get(
  "/content-items",
  validateQuery(listContentItemsQuerySchema),
  asyncHandler(controller.listContentItems)
);

lmsRouter.post(
  "/live-classes",
  validateBody(createLiveClassLinkSchema),
  asyncHandler(controller.createLiveClassLink)
);
lmsRouter.get(
  "/live-classes",
  validateQuery(listLiveClassLinksQuerySchema),
  asyncHandler(controller.listLiveClassLinks)
);
