import type { Request, Response } from "express";
import type { CreateAnnouncementInput, ListAnnouncementsQueryInput } from "@vidyut/validation";
import { created, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  const announcement = await service.createAnnouncement(req.auth!, req.body as CreateAnnouncementInput);
  created(res, announcement);
}

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListAnnouncementsQueryInput;
  const announcements = await service.listAnnouncements(req.auth!, query);
  ok(res, announcements);
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  await service.deleteAnnouncement(req.auth!, req.params.id!);
  noContent(res);
}
