import type { Request, Response } from "express";
import type {
  BulkUpsertTimetableInput,
  CreateSubstitutionInput,
  ListTimetableQueryInput,
  SubstitutionsTodayQueryInput,
} from "@vidyut/validation";
import { created, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function bulkUpsertTimetable(req: Request, res: Response): Promise<void> {
  const periods = await service.bulkUpsertTimetable(req.auth!, req.body as BulkUpsertTimetableInput);
  created(res, periods);
}

export async function listTimetable(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListTimetableQueryInput;
  const periods = await service.listTimetable(req.auth!, query);
  ok(res, periods);
}

export async function deleteTimetablePeriod(req: Request, res: Response): Promise<void> {
  await service.deleteTimetablePeriod(req.auth!, req.params.id!);
  noContent(res);
}

export async function createSubstitution(req: Request, res: Response): Promise<void> {
  const substitution = await service.createSubstitution(req.auth!, req.body as CreateSubstitutionInput);
  created(res, substitution);
}

export async function listSubstitutionsToday(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as SubstitutionsTodayQueryInput;
  const substitutions = await service.listSubstitutionsToday(req.auth!, query);
  ok(res, substitutions);
}
