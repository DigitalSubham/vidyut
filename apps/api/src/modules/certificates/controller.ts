import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import type {
  BulkIdsQueryInput,
  CreateCertificateTemplateInput,
  EsignWebhookInput,
  IssueCertificateInput,
  ListCertificateTemplatesQueryInput,
  ListCertificatesQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { created, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function issueCertificate(req: Request, res: Response): Promise<void> {
  const certificate = await service.issueCertificate(req.auth!, req.body as IssueCertificateInput);
  created(res, certificate);
}

export async function listCertificates(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListCertificatesQueryInput;
  const certificates = await service.listCertificates(req.auth!, query);
  ok(res, certificates);
}

export async function createCertificateTemplate(req: Request, res: Response): Promise<void> {
  const template = await service.createCertificateTemplate(req.auth!, req.body as CreateCertificateTemplateInput);
  created(res, template);
}

export async function listCertificateTemplates(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListCertificateTemplatesQueryInput;
  const templates = await service.listCertificateTemplates(req.auth!, query);
  ok(res, templates);
}

export async function generateBulkIds(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as BulkIdsQueryInput;
  const certificates = await service.generateBulkIds(req.auth!, query);
  created(res, certificates);
}

export async function requestSignature(req: Request, res: Response): Promise<void> {
  const certificate = await service.requestSignature(req.auth!, req.params.id!);
  ok(res, certificate);
}

/** Shared-secret check — same posture as Unit 13's Razorpay HMAC check, simpler since e-sign providers vary in what they sign. Rejects everything if ESIGN_WEBHOOK_SECRET was never configured (no real provider to receive from anyway). */
function verifyEsignWebhookSecret(req: Request): boolean {
  const secret = process.env.ESIGN_WEBHOOK_SECRET;
  const header = req.headers["x-esign-webhook-secret"];
  if (!secret || typeof header !== "string") {
    return false;
  }
  const secretBuf = Buffer.from(secret, "utf8");
  const headerBuf = Buffer.from(header, "utf8");
  if (secretBuf.length !== headerBuf.length) {
    return false;
  }
  return timingSafeEqual(secretBuf, headerBuf);
}

export async function esignWebhook(req: Request, res: Response): Promise<void> {
  if (!verifyEsignWebhookSecret(req)) {
    throw new AppError("FORBIDDEN", "certificate.errors.invalidWebhookSecret");
  }
  await service.handleEsignWebhook(req.body as EsignWebhookInput);
  noContent(res);
}
