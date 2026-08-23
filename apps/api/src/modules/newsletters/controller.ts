import type { Request, Response } from "express";
import type { CreateNewsletterInput, ListNewslettersQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createNewsletter(req: Request, res: Response): Promise<void> {
  const newsletter = await service.createAndSendNewsletter(req.auth!, req.body as CreateNewsletterInput);
  created(res, newsletter);
}

export async function listNewsletters(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListNewslettersQueryInput;
  const newsletters = await service.listNewsletters(req.auth!, query.branchId);
  ok(res, newsletters);
}
