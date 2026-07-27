import type { Request, Response } from "express";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function resolveSchoolCode(req: Request, res: Response): Promise<void> {
  const result = await service.resolveSchoolCode(req.params.schoolCode!);
  ok(res, result);
}

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  const subscription = await service.getMySubscription(req.auth!);
  ok(res, subscription);
}
