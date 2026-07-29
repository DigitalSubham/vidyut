import type { Request, Response } from "express";
import type { SearchQueryInput } from "@vidyut/validation";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function search(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as SearchQueryInput;
  const results = await service.search(req.auth!, query);
  ok(res, results);
}
