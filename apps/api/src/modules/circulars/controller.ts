import type { Request, Response } from "express";
import type { CreateCircularInput, ListCircularsQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createCircular(req: Request, res: Response): Promise<void> {
  const circular = await service.createCircular(req.auth!, req.body as CreateCircularInput);
  created(res, circular);
}

export async function listCirculars(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListCircularsQueryInput;
  const circulars = await service.listCircularsForBranch(req.auth!, query.branchId);
  ok(res, circulars);
}

export async function ackCircular(req: Request, res: Response): Promise<void> {
  const ack = await service.ackCircular(req.auth!, req.params.id!);
  ok(res, ack);
}

export async function listCircularAcks(req: Request, res: Response): Promise<void> {
  const acks = await service.listCircularAcks(req.auth!, req.params.id!);
  ok(res, acks);
}
