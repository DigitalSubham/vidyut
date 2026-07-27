import type { Request, Response } from "express";
import type { CreateHomeworkInput, ListHomeworkQueryInput, PatchHomeworkInput } from "@vidyut/validation";
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
