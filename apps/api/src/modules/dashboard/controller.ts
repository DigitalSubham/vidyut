import type { Request, Response } from "express";
import type { DashboardSummaryQueryInput } from "@vidyut/validation";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as DashboardSummaryQueryInput;
  const summary = await service.getDashboardSummary(req.auth!, query);
  ok(res, summary);
}
