import type { Job } from "bullmq";
import { withTenant } from "@vidyut/db";
import type { InventoryLowStockAlertPayload } from "@vidyut/types";

/**
 * Unit 64 — an internal ops alert (low stock), not parent-facing, so it's
 * IN_APP-only (Unit 40's existing inbox) — same posture as Unit 57's
 * `transport-expiry-alert.ts`.
 */
export async function processInventoryLowStockAlert(job: Job<InventoryLowStockAlertPayload>) {
  const { tenantId, branchId, itemId, itemName, quantity, lowStockAt } = job.data;

  return withTenant(tenantId, async (tx) => {
    const owners = await tx.userRole.findMany({ where: { role: { key: "OWNER" } }, select: { userId: true } });

    let sent = 0;
    for (const owner of owners) {
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "IN_APP",
          templateKey: "inventory.lowStock",
          toUserId: owner.userId,
          status: "SENT",
          payload: { itemId, itemName, quantity, lowStockAt },
          sentAt: new Date(),
        },
      });
      sent += 1;
    }
    return { sent };
  });
}
