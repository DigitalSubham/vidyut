import type { Request, Response } from "express";
import type {
  CancelReceiptInput,
  CreateOpeningBalanceInput,
  CreatePaymentInput,
  FeeReportsQueryInput,
  ListInvoicesQueryInput,
  ReconciliationQueryInput,
  ListPaymentsQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function generateInvoices(req: Request, res: Response): Promise<void> {
  const result = await service.generateInvoicesForStructure(req.auth!, req.params.id!);
  ok(res, result);
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListInvoicesQueryInput;
  const { items, total } = await service.listInvoices(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const invoice = await service.getInvoice(req.auth!, req.params.id!);
  ok(res, invoice);
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const idempotencyKey = req.headers["idempotency-key"];
  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
    throw new AppError("VALIDATION_ERROR", "fee.errors.idempotencyKeyRequired");
  }

  const { payment, isReplay } = await service.createPayment(
    req.auth!,
    req.body as CreatePaymentInput,
    idempotencyKey
  );
  if (isReplay) {
    ok(res, payment, 200);
  } else {
    created(res, payment);
  }
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListPaymentsQueryInput;
  const { items, total } = await service.listPayments(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getStudentFeeLedger(req: Request, res: Response): Promise<void> {
  const entries = await service.getStudentFeeLedger(req.auth!, req.params.id!);
  ok(res, entries);
}

export async function getDuesReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as FeeReportsQueryInput;
  const rows = await service.getDuesReport(req.auth!, query);
  ok(res, rows);
}

export async function getDefaultersReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as FeeReportsQueryInput;
  const rows = await service.getDefaultersReport(req.auth!, query);
  ok(res, rows);
}

export async function createOpeningBalance(req: Request, res: Response): Promise<void> {
  const invoice = await service.createOpeningBalance(
    req.auth!,
    req.params.id!,
    req.body as CreateOpeningBalanceInput
  );
  created(res, invoice);
}

export async function getReconciliation(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReconciliationQueryInput;
  const result = await service.getReconciliation(req.auth!, query);
  ok(res, result);
}

export async function cancelReceipt(req: Request, res: Response): Promise<void> {
  const receipt = await service.cancelReceipt(req.auth!, req.params.id!, req.body as CancelReceiptInput);
  ok(res, receipt);
}
