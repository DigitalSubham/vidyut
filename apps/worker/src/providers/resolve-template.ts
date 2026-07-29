import type { Prisma } from "@vidyut/db";
import { renderTemplate } from "./render-template";

/**
 * Looks up a tenant's `NotificationTemplate` for (templateKey, channel);
 * falls back to `fallback` (rendered the same way) when the tenant hasn't
 * configured one yet — so behavior doesn't break for tenants with no
 * templates registered, matching every prior unit's "never fail closed on
 * missing optional config" posture.
 */
export async function resolveTemplateBody(
  tx: Prisma.TransactionClient,
  tenantId: string,
  templateKey: string,
  channel: "SMS" | "WHATSAPP" | "PUSH" | "EMAIL",
  fallback: string,
  vars: Record<string, string | number>
): Promise<string> {
  const template = await tx.notificationTemplate.findUnique({
    where: { tenantId_templateKey_channel: { tenantId, templateKey, channel } },
  });
  return renderTemplate(template?.body ?? fallback, vars);
}
