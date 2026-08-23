import { Router } from "express";
import { createFeedbackSchema, createSupportTicketSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody } from "../../core/guards/validate";
import * as controller from "./controller";

export const supportTicketsRouter = Router();

supportTicketsRouter.use(authGuard, tenantContext);

/** Reuses `settings.manage` (OWNER/PRINCIPAL) — raising a support ticket is the same kind of account-level action as editing the school profile, not worth a new permission. */
supportTicketsRouter.post(
  "/",
  requirePermission("settings.manage"),
  validateBody(createSupportTicketSchema),
  asyncHandler(controller.createTicket)
);
supportTicketsRouter.get("/", requirePermission("settings.manage"), asyncHandler(controller.listMyTickets));

export const feedbackRouter = Router();

feedbackRouter.use(authGuard, tenantContext);

/** Unit 69 scope #5 — any authenticated user can give feedback, unlike a support ticket (no settings.manage gate). */
feedbackRouter.post("/", validateBody(createFeedbackSchema), asyncHandler(controller.createFeedback));
