import type { Request, Response } from "express";
import type { ListDocumentsQueryInput, RequestDocumentUploadInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function requestDocumentUpload(req: Request, res: Response): Promise<void> {
  const result = await service.requestDocumentUpload(req.auth!, req.body as RequestDocumentUploadInput);
  created(res, result);
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListDocumentsQueryInput;
  const documents = await service.listDocuments(req.auth!, query);
  ok(res, documents);
}
