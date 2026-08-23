import type { Request, Response } from "express";
import type { CreatePublicNoticeInput, ListPublicNoticesQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createNotice(req: Request, res: Response): Promise<void> {
  const notice = await service.createNotice(req.auth!, req.body as CreatePublicNoticeInput);
  created(res, notice);
}

export async function listNotices(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListPublicNoticesQueryInput;
  const notices = await service.listNotices(req.auth!, query.branchId);
  ok(res, notices);
}
