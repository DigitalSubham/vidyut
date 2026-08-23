import { withTenant } from "@vidyut/db";
import type { CreateFeedbackInput, CreateSupportTicketInput } from "@vidyut/validation";
import type { RequestAuth } from "../../core/guards/types";

/** Unit 56 — tenant-side create/list. Always the caller's own tenant; no cross-tenant read from this module (that's the platform side, see modules/platform/service.ts). */
export async function createTicket(auth: RequestAuth, input: CreateSupportTicketInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.supportTicket.create({
      data: {
        tenantId: auth.tenantId,
        subject: input.subject,
        body: input.body,
        priority: input.priority,
        createdById: auth.userId,
      },
    })
  );
}

export async function listMyTickets(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) => tx.supportTicket.findMany({ orderBy: { createdAt: "desc" } }));
}

/** Unit 69 scope #5 — any authenticated user can submit feedback (unlike support tickets, not gated behind settings.manage). */
export async function createFeedback(auth: RequestAuth, input: CreateFeedbackInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.supportTicket.create({
      data: {
        tenantId: auth.tenantId,
        type: "FEEDBACK",
        subject: input.category,
        body: input.body,
        createdById: auth.userId,
      },
    })
  );
}
