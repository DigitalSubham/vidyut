import type { Request, Response } from "express";
import type { CreateFeedbackInput, CreateSupportTicketInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createTicket(req: Request, res: Response): Promise<void> {
  const ticket = await service.createTicket(req.auth!, req.body as CreateSupportTicketInput);
  created(res, ticket);
}

export async function listMyTickets(req: Request, res: Response): Promise<void> {
  const tickets = await service.listMyTickets(req.auth!);
  ok(res, tickets);
}

export async function createFeedback(req: Request, res: Response): Promise<void> {
  const feedback = await service.createFeedback(req.auth!, req.body as CreateFeedbackInput);
  created(res, feedback);
}
