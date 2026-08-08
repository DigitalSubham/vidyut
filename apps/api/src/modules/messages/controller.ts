import type { Request, Response } from "express";
import type { ListMessagesQueryInput, SendMessageInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const message = await service.sendMessage(req.auth!, req.body as SendMessageInput);
  created(res, message);
}

export async function listThread(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListMessagesQueryInput;
  const messages = await service.listThread(req.auth!, query.staffId, query.guardianId);
  ok(res, messages);
}

export async function listMyThreads(req: Request, res: Response): Promise<void> {
  const threads = await service.listMyThreads(req.auth!);
  ok(res, threads);
}
