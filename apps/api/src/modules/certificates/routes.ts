import { Router } from "express";
import { issueCertificateSchema, listCertificatesQuerySchema } from "@vidyut/validation";
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
