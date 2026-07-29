import type { Request, Response } from "express";
import type {
  CreateHomeworkInput,
  GradeHomeworkSubmissionInput,
  ListHomeworkQueryInput,
  PatchHomeworkInput,
  RequestHomeworkSubmissionUploadInput,
} from "@vidyut/validation";
import { created, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createHomework(req: Request, res: Response): Promise<void> {
  const homework = await service.createHomework(req.auth!, req.body as CreateHomeworkInput);
  created(res, homework);
}

export async function listHomework(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListHomeworkQueryInput;
  const homework = await service.listHomework(req.auth!, query);
  ok(res, homework);
}

export async function patchHomework(req: Request, res: Response): Promise<void> {
  const homework = await service.patchHomework(req.auth!, req.params.id!, req.body as PatchHomeworkInput);
  ok(res, homework);
}

export async function deleteHomework(req: Request, res: Response): Promise<void> {
  await service.deleteHomework(req.auth!, req.params.id!);
  noContent(res);
}

export async function requestHomeworkSubmissionUpload(req: Request, res: Response): Promise<void> {
  const result = await service.requestHomeworkSubmissionUpload(
    req.auth!,
    req.params.id!,
    req.body as RequestHomeworkSubmissionUploadInput
  );
  created(res, result);
}

export async function gradeHomeworkSubmission(req: Request, res: Response): Promise<void> {
  const submission = await service.gradeHomeworkSubmission(
    req.auth!,
    req.params.id!,
    req.body as GradeHomeworkSubmissionInput
  );
  ok(res, submission);
}

export async function listHomeworkSubmissions(req: Request, res: Response): Promise<void> {
  const submissions = await service.listHomeworkSubmissions(req.auth!, req.params.id!);
  ok(res, submissions);
}
