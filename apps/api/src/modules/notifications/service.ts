import { withTenant } from "@vidyut/db";
import type {
  CreateNotificationTemplateInput,
  ListNotificationsQueryInput,
  PatchNotificationTemplateInput,
} from "@vidyut/validation";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { AppError } from "../../core/errors";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** Manual trigger (context/feature-specs/14-fee-reminders.md) — scoped to the caller's own tenant only. */
export async function runReminderScan(auth: RequestAuth): Promise<{ jobId: string }> {
  const jobId = await enqueue("fees.reminderScan", { tenantId: auth.tenantId });
  return { jobId };
}

export async function listNotifications(auth: RequestAuth, query: ListNotificationsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.notificationLog.count({ where }),
    ]);
    return { items, total };
  });
}

// --- Unit 40: Notification Templates ---
// A lookup the real send functions consult instead of hardcoded strings
// (Scope item 2). `dltId` records a DLT-approved template ID once the user
// has registered one — this repo can't self-certify DLT compliance
// (Open Question 2).

export async function createNotificationTemplate(auth: RequestAuth, input: CreateNotificationTemplateInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.notificationTemplate.findUnique({
      where: { tenantId_templateKey_channel: { tenantId: auth.tenantId, templateKey: input.templateKey, channel: input.channel } },
    });
    if (existing) {
      throw new AppError("CONFLICT", "notification.errors.templateAlreadyExists");
    }
    return tx.notificationTemplate.create({
      data: { tenantId: auth.tenantId, templateKey: input.templateKey, channel: input.channel, body: input.body, dltId: input.dltId },
    });
  });
}

export async function listNotificationTemplates(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.notificationTemplate.findMany({ orderBy: { templateKey: "asc" } })
  );
}

async function getTemplateOrThrow(auth: RequestAuth, id: string) {
  const template = await withTenant(auth.tenantId, (tx) => tx.notificationTemplate.findUnique({ where: { id } }));
  if (!template) {
    throw new AppError("NOT_FOUND", "notification.errors.templateNotFound");
  }
  return template;
}

export async function patchNotificationTemplate(auth: RequestAuth, id: string, input: PatchNotificationTemplateInput) {
  await getTemplateOrThrow(auth, id);
  return withTenant(auth.tenantId, (tx) => tx.notificationTemplate.update({ where: { id }, data: input }));
}
