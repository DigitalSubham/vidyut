import { Router } from "express";
import { decideRefundRequestSchema, listRefundRequestsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

/** Mounted at /api/v1/webhooks/razorpay — public, no authGuard (Razorpay doesn't send our JWTs). */
export const razorpayWebhookRouter = Router();
razorpayWebhookRouter.post("/", asyncHandler(controller.razorpayWebhook));

/** Mounted at /api/v1/refund-requests. */
export const refundRequestsRouter = Router();
refundRequestsRouter.use(authGuard, tenantContext);

refundRequestsRouter.get(
  "/",
  requirePermission("fee.view"),
  validateQuery(listRefundRequestsQuerySchema),
  asyncHandler(controller.listRefundRequests)
);
refundRequestsRouter.patch(
  "/:id/decide",
  requirePermission("fee.refund"),
  validateBody(decideRefundRequestSchema),
  asyncHandler(controller.decideRefundRequest)
);
