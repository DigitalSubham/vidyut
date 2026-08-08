import type { Request, Response } from "express";
import type { CreateCalendarEventInput, ListCalendarEventsQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createCalendarEvent(req: Request, res: Response): Promise<void> {
  const event = await service.createCalendarEvent(req.auth!, req.body as CreateCalendarEventInput);
  created(res, event);
}

export async function listCalendarEvents(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListCalendarEventsQueryInput;
  const events = await service.listCalendarEventsForBranch(req.auth!, query.branchId);
  ok(res, events);
}
