import type { Request, Response } from "express";
import type {
  CreateReportCardTemplateInput,
  GenerateReportCardsInput,
  ListReportCardTemplatesQueryInput,
  ListReportCardsQueryInput,
  PatchReportCardTemplateInput,
} from "@vidyut/validation";
import { created, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const template = await service.createTemplate(req.auth!, req.body as CreateReportCardTemplateInput);
  created(res, template);
}

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListReportCardTemplatesQueryInput;
  const templates = await service.listTemplates(req.auth!, query);
  ok(res, templates);
}

export async function patchTemplate(req: Request, res: Response): Promise<void> {
  const template = await service.patchTemplate(req.auth!, req.params.id!, req.body as PatchReportCardTemplateInput);
  ok(res, template);
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  await service.deleteTemplate(req.auth!, req.params.id!);
  noContent(res);
}

export async function generateReportCards(req: Request, res: Response): Promise<void> {
  const reportCards = await service.generateReportCards(req.auth!, req.body as GenerateReportCardsInput);
  created(res, reportCards);
}

export async function listReportCards(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListReportCardsQueryInput;
  const reportCards = await service.listReportCards(req.auth!, query);
  ok(res, reportCards);
}

export async function publishReportCard(req: Request, res: Response): Promise<void> {
  const reportCard = await service.publishReportCard(req.auth!, req.params.id!);
  ok(res, reportCard);
}
