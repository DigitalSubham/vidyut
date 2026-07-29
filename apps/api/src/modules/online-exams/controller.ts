import type { Request, Response } from "express";
import type {
  AddOnlineExamQuestionFromBankInput,
  AddOnlineExamQuestionInput,
  CreateOnlineExamInput,
  ListOnlineExamsQueryInput,
  SubmitOnlineExamInput,
  TakeOnlineExamQueryInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function createOnlineExam(req: Request, res: Response): Promise<void> {
  const exam = await service.createOnlineExam(req.auth!, req.body as CreateOnlineExamInput);
  created(res, exam);
}

export async function listOnlineExams(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListOnlineExamsQueryInput;
  const { items, total } = await service.listOnlineExams(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function publishOnlineExam(req: Request, res: Response): Promise<void> {
  const exam = await service.publishOnlineExam(req.auth!, req.params.id!);
  ok(res, exam);
}

export async function addOnlineExamQuestion(req: Request, res: Response): Promise<void> {
  const question = await service.addOnlineExamQuestion(
    req.auth!,
    req.params.id!,
    req.body as AddOnlineExamQuestionInput
  );
  created(res, question);
}

export async function addOnlineExamQuestionFromBank(req: Request, res: Response): Promise<void> {
  const question = await service.addOnlineExamQuestionFromBank(
    req.auth!,
    req.params.id!,
    req.body as AddOnlineExamQuestionFromBankInput
  );
  created(res, question);
}

export async function listOnlineExamQuestions(req: Request, res: Response): Promise<void> {
  // Staff (any permission-bearing role reaching this route) see the answer
  // key; the auth guard above already keeps unauthenticated callers out, and
  // the student-submission flow never calls this endpoint.
  const questions = await service.listOnlineExamQuestions(req.auth!, req.params.id!, true);
  ok(res, questions);
}

export async function getOnlineExamForStudent(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as TakeOnlineExamQueryInput;
  const result = await service.getOnlineExamForStudent(req.auth!, req.params.id!, query.studentId);
  ok(res, result);
}

export async function submitOnlineExam(req: Request, res: Response): Promise<void> {
  const submission = await service.submitOnlineExam(req.auth!, req.params.id!, req.body as SubmitOnlineExamInput);
  created(res, submission);
}

export async function listOnlineExamSubmissions(req: Request, res: Response): Promise<void> {
  const submissions = await service.listOnlineExamSubmissions(req.auth!, req.params.id!);
  ok(res, submissions);
}

export async function listMyOnlineExams(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as TakeOnlineExamQueryInput;
  const exams = await service.listMyOnlineExams(req.auth!, query.studentId);
  ok(res, exams);
}
