import { withTenant } from "@vidyut/db";
import type { ListNotificationsQueryInput } from "@vidyut/validation";
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
