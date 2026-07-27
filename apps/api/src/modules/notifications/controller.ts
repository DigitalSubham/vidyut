import type { Request, Response } from "express";
import type { ListNotificationsQueryInput } from "@vidyut/validation";
import { list, ok } from "../../core/envelope";
import * as service from "./service";

export async function runReminderScan(req: Request, res: Response): Promise<void> {
  const result = await service.runReminderScan(req.auth!);
  ok(res, result, 202);
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListNotificationsQueryInput;
  const { items, total } = await service.listNotifications(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}
