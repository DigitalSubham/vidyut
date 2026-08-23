import type { Request, Response } from "express";
import type {
  CreateExpenseHeadInput,
  CreateExpenseInput,
  ExportAccountingQueryInput,
  ListExpenseHeadsQueryInput,
  ListExpensesQueryInput,
} from "@vidyut/validation";
import { toCsv } from "../../core/csv";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createExpenseHead(req: Request, res: Response): Promise<void> {
  const head = await service.createExpenseHead(req.auth!, req.body as CreateExpenseHeadInput);
  created(res, head);
}

export async function listExpenseHeads(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListExpenseHeadsQueryInput;
  const heads = await service.listExpenseHeads(req.auth!, query.branchId);
  ok(res, heads);
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  const expense = await service.createExpense(req.auth!, req.body as CreateExpenseInput);
  created(res, expense);
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListExpensesQueryInput;
  const expenses = await service.listExpenses(req.auth!, query.branchId);
  ok(res, expenses);
}

export async function exportAccounting(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ExportAccountingQueryInput;
  const rows = await service.exportAccounting(req.auth!, query);
  res.type("text/csv").send(toCsv(rows as unknown as Record<string, unknown>[]));
}
