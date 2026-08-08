import type { Request, Response } from "express";
import type { CreatePTMSlotInput, ListPTMSlotsQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createSlot(req: Request, res: Response): Promise<void> {
  const slot = await service.createSlot(req.auth!, req.body as CreatePTMSlotInput);
  created(res, slot);
}

export async function listSlots(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListPTMSlotsQueryInput;
  const slots = await service.listSlotsForStaff(req.auth!, query.staffId, query.availableOnly);
  ok(res, slots);
}

export async function bookSlot(req: Request, res: Response): Promise<void> {
  const slot = await service.bookSlot(req.auth!, req.params.id!);
  ok(res, slot);
}
