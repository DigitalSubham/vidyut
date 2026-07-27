import type { Request, Response } from "express";
import type {
  CreateStudentInput,
  ImportStudentsInput,
  ListStudentsQueryInput,
  PatchStudentInput,
  RequestImportUploadInput,
} from "@vidyut/validation";
import { created, list, noContent, ok } from "../../core/envelope";
// 202 Accepted for the async import job — no dedicated envelope helper exists
// for this one status, so `ok(res, data, 202)` is used directly.
import * as service from "./service";

export async function createStudent(req: Request, res: Response): Promise<void> {
  const student = await service.createStudent(req.auth!, req.body as CreateStudentInput);
  created(res, student);
}

export async function listStudents(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStudentsQueryInput;
  const { items, total } = await service.listStudents(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getStudent(req: Request, res: Response): Promise<void> {
  const student = await service.getStudent(req.auth!, req.params.id!);
  ok(res, student);
}

export async function patchStudent(req: Request, res: Response): Promise<void> {
  const student = await service.patchStudent(req.auth!, req.params.id!, req.body as PatchStudentInput);
  ok(res, student);
}

export async function deleteStudent(req: Request, res: Response): Promise<void> {
  await service.deleteStudent(req.auth!, req.params.id!);
  noContent(res);
}

export async function requestImportUpload(req: Request, res: Response): Promise<void> {
  const result = await service.requestImportUpload(req.auth!, req.body as RequestImportUploadInput);
  ok(res, result);
}

export async function importStudents(req: Request, res: Response): Promise<void> {
  const result = await service.importStudents(req.auth!, req.body as ImportStudentsInput);
  ok(res, result, 202);
}
