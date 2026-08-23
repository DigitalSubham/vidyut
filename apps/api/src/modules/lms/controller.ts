import type { Request, Response } from "express";
import type {
  CreateContentItemInput,
  CreateLessonPlanInput,
  CreateLiveClassLinkInput,
  CreateSyllabusChapterInput,
  ListContentItemsQueryInput,
  ListLessonPlansQueryInput,
  ListLiveClassLinksQueryInput,
  ListSyllabusChaptersQueryInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createSyllabusChapter(req: Request, res: Response): Promise<void> {
  const chapter = await service.createSyllabusChapter(req.auth!, req.body as CreateSyllabusChapterInput);
  created(res, chapter);
}

export async function listSyllabusChapters(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSyllabusChaptersQueryInput;
  const chapters = await service.listSyllabusChapters(req.auth!, query.subjectId, query.classId);
  ok(res, chapters);
}

export async function markSyllabusChapterComplete(req: Request, res: Response): Promise<void> {
  const chapter = await service.markSyllabusChapterComplete(req.auth!, req.params.id!);
  ok(res, chapter);
}

export async function createLessonPlan(req: Request, res: Response): Promise<void> {
  const plan = await service.createLessonPlan(req.auth!, req.body as CreateLessonPlanInput);
  created(res, plan);
}

export async function listLessonPlans(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListLessonPlansQueryInput;
  const plans = await service.listLessonPlans(req.auth!, query.sectionId, query.subjectId);
  ok(res, plans);
}

export async function createContentItem(req: Request, res: Response): Promise<void> {
  const item = await service.createContentItem(req.auth!, req.body as CreateContentItemInput);
  created(res, item);
}

export async function listContentItems(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListContentItemsQueryInput;
  const items = await service.listContentItems(req.auth!, query.subjectId, query.classId);
  ok(res, items);
}

export async function createLiveClassLink(req: Request, res: Response): Promise<void> {
  const link = await service.createLiveClassLink(req.auth!, req.body as CreateLiveClassLinkInput);
  created(res, link);
}

export async function listLiveClassLinks(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListLiveClassLinksQueryInput;
  const links = await service.listLiveClassLinks(req.auth!, query.sectionId);
  ok(res, links);
}
