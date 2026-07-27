import { Router } from "express";
import {
  createPlatformInvoiceSchema,
  createTenantSchema,
  impersonateSchema,
  listTenantsQuerySchema,
  patchPlatformInvoiceStatusSchema,
  patchTenantSchema,
  platformLoginSchema,
  revenueSummaryQuerySchema,
  walletRechargeSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { validateBody, validateQuery } from "../../core/guards/validate";
import { platformAuthGuard } from "../../core/guards/platform-auth-guard";
import * as controller from "./controller";

export const platformRouter = Router();

platformRouter.post(
  "/auth/login",
  validateBody(platformLoginSchema),
  asyncHandler(controller.login)
);

platformRouter.post(
  "/tenants",
  platformAuthGuard,
  validateBody(createTenantSchema),
  asyncHandler(controller.createTenant)
);

platformRouter.get(
  "/tenants",
  platformAuthGuard,
  validateQuery(listTenantsQuerySchema),
  asyncHandler(controller.listTenants)
);

platformRouter.get("/tenants/:id", platformAuthGuard, asyncHandler(controller.getTenant));

platformRouter.patch(
  "/tenants/:id",
  platformAuthGuard,
  validateBody(patchTenantSchema),
  asyncHandler(controller.patchTenant)
);

platformRouter.get(
  "/tenants/:id/usage",
  platformAuthGuard,
  asyncHandler(controller.getTenantUsage)
);

platformRouter.post(
  "/tenants/:id/impersonate",
  platformAuthGuard,
  validateBody(impersonateSchema),
  asyncHandler(controller.impersonate)
);

platformRouter.post(
  "/tenants/:id/invoices",
  platformAuthGuard,
  validateBody(createPlatformInvoiceSchema),
  asyncHandler(controller.createPlatformInvoice)
);

platformRouter.get(
  "/tenants/:id/invoices",
  platformAuthGuard,
  asyncHandler(controller.listPlatformInvoices)
);

platformRouter.patch(
  "/tenants/:id/invoices/:invoiceId",
  platformAuthGuard,
  validateBody(patchPlatformInvoiceStatusSchema),
  asyncHandler(controller.patchPlatformInvoiceStatus)
);

platformRouter.post(
  "/tenants/:id/wallet/recharge",
  platformAuthGuard,
  validateBody(walletRechargeSchema),
  asyncHandler(controller.rechargeWallet)
);

platformRouter.get(
  "/revenue/summary",
  platformAuthGuard,
  validateQuery(revenueSummaryQuerySchema),
  asyncHandler(controller.getRevenueSummary)
);
