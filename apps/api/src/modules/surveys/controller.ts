import type { Request, Response } from "express";
import type { CreateSurveyInput, ListSurveysQueryInput, RespondSurveyInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createSurvey(req: Request, res: Response): Promise<void> {
  const survey = await service.createSurvey(req.auth!, req.body as CreateSurveyInput);
  created(res, survey);
}

export async function listSurveys(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSurveysQueryInput;
  const surveys = await service.listSurveysForBranch(req.auth!, query.branchId);
  ok(res, surveys);
}

export async function respondSurvey(req: Request, res: Response): Promise<void> {
  const responses = await service.respondSurvey(req.auth!, req.params.id!, req.body as RespondSurveyInput);
  created(res, responses);
}

export async function getSurveyResults(req: Request, res: Response): Promise<void> {
  const results = await service.getSurveyResults(req.auth!, req.params.id!);
  ok(res, results);
}
