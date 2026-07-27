import type { Request, Response } from "express";
import type { IssueCertificateInput, ListCertificatesQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
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
