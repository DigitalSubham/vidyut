import type { Request, Response } from "express";
import type { CreateComplaintInput, ListComplaintsQueryInput, ResolveComplaintInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createComplaint(req: Request, res: Response): Promise<void> {
  const complaint = await service.createComplaint(req.auth!, req.body as CreateComplaintInput);
  created(res, complaint);
}

export async function listComplaints(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListComplaintsQueryInput;
  const complaints = await service.listComplaints(req.auth!, query);
  ok(res, complaints);
}

export async function resolveComplaint(req: Request, res: Response): Promise<void> {
  const complaint = await service.resolveComplaint(req.auth!, req.params.id!, req.body as ResolveComplaintInput);
  ok(res, complaint);
}

export async function getMyComplaints(req: Request, res: Response): Promise<void> {
  const complaints = await service.getMyComplaints(req.auth!);
  ok(res, complaints);
}
