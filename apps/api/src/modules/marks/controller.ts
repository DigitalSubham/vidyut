import type { Request, Response } from "express";
import type { BulkEnterMarksInput, ListMarksQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function bulkEnterMarks(req: Request, res: Response): Promise<void> {
  const entries = await service.bulkEnterMarks(req.auth!, req.body as BulkEnterMarksInput);
  created(res, entries);
}

export async function listMarks(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListMarksQueryInput;
  const entries = await service.listMarks(req.auth!, query);
  ok(res, entries);
}

export async function lockMarksEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.lockMarksEntry(req.auth!, req.params.id!);
  ok(res, entry);
}
