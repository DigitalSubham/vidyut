import { Router } from "express";
import {
  bulkIdsQuerySchema,
  createCertificateTemplateSchema,
  esignWebhookSchema,
  issueCertificateSchema,
  listCertificatesQuerySchema,
  listCertificateTemplatesQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const certificatesRouter = Router();

certificatesRouter.use(authGuard, tenantContext);

certificatesRouter.post(
  "/",
  requirePermission("certificate.issue"),
  validateBody(issueCertificateSchema),
  asyncHandler(controller.issueCertificate)
);

certificatesRouter.get(
  "/",
  requirePermission("certificate.issue"),
  validateQuery(listCertificatesQuerySchema),
  asyncHandler(controller.listCertificates)
);

certificatesRouter.post(
  "/templates",
  requirePermission("certificate.issue"),
  validateBody(createCertificateTemplateSchema),
  asyncHandler(controller.createCertificateTemplate)
);

certificatesRouter.get(
  "/templates",
  requirePermission("certificate.issue"),
  validateQuery(listCertificateTemplatesQuerySchema),
  asyncHandler(controller.listCertificateTemplates)
);

certificatesRouter.post(
  "/bulk-ids",
  requirePermission("certificate.issue"),
  validateQuery(bulkIdsQuerySchema),
  asyncHandler(controller.generateBulkIds)
);

certificatesRouter.post(
  "/:id/request-signature",
  requirePermission("certificate.issue"),
  asyncHandler(controller.requestSignature)
);

/** Mounted at /api/v1/webhooks/esign — public, no authGuard (the provider doesn't send our JWTs). Same posture as Unit 13's razorpayWebhookRouter. */
export const esignWebhookRouter = Router();
esignWebhookRouter.post("/", validateBody(esignWebhookSchema), asyncHandler(controller.esignWebhook));
