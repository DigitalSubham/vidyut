import type { Request, Response } from "express";
import type {
  CreateNotificationTemplateInput,
  ListNotificationsQueryInput,
  PatchNotificationTemplateInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
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

export async function createNotificationTemplate(req: Request, res: Response): Promise<void> {
  const template = await service.createNotificationTemplate(req.auth!, req.body as CreateNotificationTemplateInput);
  created(res, template);
}

export async function listNotificationTemplates(req: Request, res: Response): Promise<void> {
  const templates = await service.listNotificationTemplates(req.auth!);
  ok(res, templates);
}

export async function patchNotificationTemplate(req: Request, res: Response): Promise<void> {
  const template = await service.patchNotificationTemplate(
    req.auth!,
    req.params.id!,
    req.body as PatchNotificationTemplateInput
  );
  ok(res, template);
}
