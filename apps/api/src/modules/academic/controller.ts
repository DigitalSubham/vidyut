import type { Request, Response } from "express";
import type {
  CreateClassInput,
  CreateClassSubjectInput,
  CreateSectionInput,
  CreateSessionInput,
  CreateSubjectInput,
  CreateTeacherAssignmentInput,
  ListClassesQueryInput,
  ListSectionsQueryInput,
  ListSessionsQueryInput,
  ListSubjectsQueryInput,
  ListTeacherAssignmentsQueryInput,
  PatchClassInput,
  PatchSectionInput,
  PatchSessionInput,
  PatchSubjectInput,
  RolloverCommitInput,
  RolloverPreviewInput,
} from "@vidyut/validation";
import { created, list, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createSession(req: Request, res: Response): Promise<void> {
  const session = await service.createSession(req.auth!, req.body as CreateSessionInput);
  created(res, session);
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSessionsQueryInput;
  const { items, total } = await service.listSessions(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchSession(req: Request, res: Response): Promise<void> {
  const session = await service.patchSession(req.auth!, req.params.id!, req.body as PatchSessionInput);
  ok(res, session);
}

export async function createClass(req: Request, res: Response): Promise<void> {
  const cls = await service.createClass(req.auth!, req.body as CreateClassInput);
  created(res, cls);
}

export async function listClasses(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListClassesQueryInput;
  const { items, total } = await service.listClasses(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchClass(req: Request, res: Response): Promise<void> {
  const cls = await service.patchClass(req.auth!, req.params.id!, req.body as PatchClassInput);
  ok(res, cls);
}

export async function deleteClass(req: Request, res: Response): Promise<void> {
  await service.deleteClass(req.auth!, req.params.id!);
  noContent(res);
}

export async function createSection(req: Request, res: Response): Promise<void> {
  const section = await service.createSection(
    req.auth!,
    req.params.classId!,
    req.body as CreateSectionInput
  );
  created(res, section);
}

export async function listSections(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSectionsQueryInput;
  const { items, total } = await service.listSections(req.auth!, req.params.classId!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchSection(req: Request, res: Response): Promise<void> {
  const section = await service.patchSection(
    req.auth!,
    req.params.classId!,
    req.params.id!,
    req.body as PatchSectionInput
  );
  ok(res, section);
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  await service.deleteSection(req.auth!, req.params.classId!, req.params.id!);
  noContent(res);
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  const subject = await service.createSubject(req.auth!, req.body as CreateSubjectInput);
  created(res, subject);
}

export async function listSubjects(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSubjectsQueryInput;
  const { items, total } = await service.listSubjects(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchSubject(req: Request, res: Response): Promise<void> {
  const subject = await service.patchSubject(req.auth!, req.params.id!, req.body as PatchSubjectInput);
  ok(res, subject);
}

export async function deleteSubject(req: Request, res: Response): Promise<void> {
  await service.deleteSubject(req.auth!, req.params.id!);
  noContent(res);
}

export async function createClassSubject(req: Request, res: Response): Promise<void> {
  const link = await service.createClassSubject(
    req.auth!,
    req.params.classId!,
    req.body as CreateClassSubjectInput
  );
  created(res, link);
}

export async function listClassSubjects(req: Request, res: Response): Promise<void> {
  const items = await service.listClassSubjects(req.auth!, req.params.classId!);
  ok(res, items);
}

export async function deleteClassSubject(req: Request, res: Response): Promise<void> {
  await service.deleteClassSubject(req.auth!, req.params.classId!, req.params.subjectId!);
  noContent(res);
}

export async function createTeacherAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await service.createTeacherAssignment(
    req.auth!,
    req.body as CreateTeacherAssignmentInput
  );
  created(res, assignment);
}

export async function listTeacherAssignments(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListTeacherAssignmentsQueryInput;
  const { items, total } = await service.listTeacherAssignments(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function listMyTeacherAssignments(req: Request, res: Response): Promise<void> {
  const assignments = await service.listMyTeacherAssignments(req.auth!);
  ok(res, assignments);
}

export async function deleteTeacherAssignment(req: Request, res: Response): Promise<void> {
  await service.deleteTeacherAssignment(req.auth!, req.params.id!);
  noContent(res);
}

export async function previewRollover(req: Request, res: Response): Promise<void> {
  const preview = await service.previewRollover(req.auth!, req.body as RolloverPreviewInput);
  ok(res, preview);
}

export async function commitRollover(req: Request, res: Response): Promise<void> {
  const result = await service.commitRollover(req.auth!, req.body as RolloverCommitInput);
  ok(res, result);
}
