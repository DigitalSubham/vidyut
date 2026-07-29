import type { Request, Response } from "express";
import type { CreateQuestionBankItemInput, ListQuestionBankQueryInput } from "@vidyut/validation";
import { created, list } from "../../core/envelope";
import * as service from "./service";

export async function createQuestionBankItem(req: Request, res: Response): Promise<void> {
  const item = await service.createQuestionBankItem(req.auth!, req.body as CreateQuestionBankItemInput);
  created(res, item);
}

export async function listQuestionBankItems(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListQuestionBankQueryInput;
  const { items, total } = await service.listQuestionBankItems(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}
