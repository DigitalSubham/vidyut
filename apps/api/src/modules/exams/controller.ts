import type { Request, Response } from "express";
import type {
  BulkEnterCoScholasticGradesInput,
  CreateExamInput,
  CreateExamSubjectInput,
  CreateExamTimetableInput,
  ListExamsQueryInput,
  PatchExamInput,
} from "@vidyut/validation";
import { created, list, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createExam(req: Request, res: Response): Promise<void> {
  const exam = await service.createExam(req.auth!, req.body as CreateExamInput);
  created(res, exam);
}

export async function listExams(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListExamsQueryInput;
  const { items, total } = await service.listExams(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchExam(req: Request, res: Response): Promise<void> {
  const exam = await service.patchExam(req.auth!, req.params.id!, req.body as PatchExamInput);
  ok(res, exam);
}

export async function deleteExam(req: Request, res: Response): Promise<void> {
  await service.deleteExam(req.auth!, req.params.id!);
  noContent(res);
}

export async function createExamSubject(req: Request, res: Response): Promise<void> {
  const examSubject = await service.createExamSubject(
    req.auth!,
    req.params.examId!,
    req.body as CreateExamSubjectInput
  );
  created(res, examSubject);
}

export async function listExamSubjects(req: Request, res: Response): Promise<void> {
  const items = await service.listExamSubjects(req.auth!, req.params.examId!);
  ok(res, items);
}

export async function deleteExamSubject(req: Request, res: Response): Promise<void> {
  await service.deleteExamSubject(req.auth!, req.params.examId!, req.params.id!);
  noContent(res);
}

export async function createExamTimetable(req: Request, res: Response): Promise<void> {
  const row = await service.createExamTimetable(req.auth!, req.params.examId!, req.body as CreateExamTimetableInput);
  created(res, row);
}

export async function listExamTimetable(req: Request, res: Response): Promise<void> {
  const rows = await service.listExamTimetable(req.auth!, req.params.examId!);
  ok(res, rows);
}

export async function bulkEnterCoScholasticGrades(req: Request, res: Response): Promise<void> {
  const rows = await service.bulkEnterCoScholasticGrades(
    req.auth!,
    req.params.examId!,
    req.body as BulkEnterCoScholasticGradesInput
  );
  created(res, rows);
}

export async function listCoScholasticGrades(req: Request, res: Response): Promise<void> {
  const rows = await service.listCoScholasticGrades(req.auth!, req.params.examId!);
  ok(res, rows);
}

export async function getExamRank(req: Request, res: Response): Promise<void> {
  const rows = await service.getExamRank(req.auth!, req.params.id!);
  ok(res, rows);
}
