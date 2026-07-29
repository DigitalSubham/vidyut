import type { Request, Response } from "express";
import type { RejectDataDeletionRequestInput } from "@vidyut/validation";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function listDataDeletionRequests(req: Request, res: Response): Promise<void> {
  const requests = await service.listDataDeletionRequests(req.auth!);
  ok(res, requests);
}

export async function rejectDataDeletionRequest(req: Request, res: Response): Promise<void> {
  const request = await service.rejectDataDeletionRequest(
    req.auth!,
    req.params.id!,
    req.body as RejectDataDeletionRequestInput
  );
  ok(res, request);
}

export async function executeDataDeletionRequest(req: Request, res: Response): Promise<void> {
  const request = await service.executeDataDeletionRequest(req.auth!, req.params.id!);
  ok(res, request);
}
