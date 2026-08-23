import type { Request, Response } from "express";
import type { ExportPayrollQueryInput, ListSalaryStructuresQueryInput, UpsertSalaryStructureInput } from "@vidyut/validation";
import { toCsv } from "../../core/csv";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function upsertSalaryStructure(req: Request, res: Response): Promise<void> {
  const structure = await service.upsertSalaryStructure(req.auth!, req.body as UpsertSalaryStructureInput);
  ok(res, structure);
}

export async function listSalaryStructures(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListSalaryStructuresQueryInput;
  const structures = await service.listSalaryStructures(req.auth!, query.branchId);
  ok(res, structures);
}

export async function exportPayroll(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ExportPayrollQueryInput;
  const rows = await service.exportPayroll(req.auth!, query);
  res.type("text/csv").send(toCsv(rows as unknown as Record<string, unknown>[]));
}
