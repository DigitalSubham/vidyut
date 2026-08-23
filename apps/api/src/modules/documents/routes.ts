import { Router } from "express";
import { listDocumentsQuerySchema, requestDocumentUploadSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const documentsRouter = Router();

documentsRouter.use(authGuard, tenantContext);

documentsRouter.post(
  "/",
  requirePermission("certificate.issue"),
  validateBody(requestDocumentUploadSchema),
  asyncHandler(controller.requestDocumentUpload)
);

documentsRouter.get(
  "/",
  requirePermission("certificate.issue"),
  validateQuery(listDocumentsQuerySchema),
  asyncHandler(controller.listDocuments)
);
