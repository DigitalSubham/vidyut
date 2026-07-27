import type { Request, Response } from "express";
import type {
  CreateRefundRequestInput,
  DecideRefundRequestInput,
  InitiateOnlinePaymentInput,
  ListRefundRequestsQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { created, list, noContent, ok } from "../../core/envelope";
import * as service from "./service";
import type { RazorpayWebhookBody } from "./service";

export async function initiateOnlinePayment(req: Request, res: Response): Promise<void> {
  const result = await service.initiateOnlinePayment(req.auth!, req.body as InitiateOnlinePaymentInput);
  created(res, result);
}

export async function razorpayWebhook(req: Request, res: Response): Promise<void> {
  if (!req.rawBody) {
    throw new AppError("VALIDATION_ERROR", "fee.errors.webhookMissingBody");
  }
  const signature = req.headers["x-razorpay-signature"];
  await service.handleRazorpayWebhook(
    req.rawBody,
    typeof signature === "string" ? signature : undefined,
    req.body as RazorpayWebhookBody
  );
  noContent(res);
}

export async function createRefundRequest(req: Request, res: Response): Promise<void> {
  const refundRequest = await service.createRefundRequest(
    req.auth!,
    req.params.id!,
    req.body as CreateRefundRequestInput
  );
  created(res, refundRequest);
}

export async function listRefundRequests(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListRefundRequestsQueryInput;
  const { items, total } = await service.listRefundRequests(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function decideRefundRequest(req: Request, res: Response): Promise<void> {
  const refundRequest = await service.decideRefundRequest(
    req.auth!,
    req.params.id!,
    req.body as DecideRefundRequestInput
  );
  ok(res, refundRequest);
}
