import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { InventoryLowStockScanPayload } from "@vidyut/types";
import { enqueue } from "../enqueue";

/**
 * Unit 64 scope #5 — same nightly-cron-scan shape as Unit 14's
 * `fees-reminder-scan.ts`: no tenantId scans every ACTIVE tenant with the
 * `inventory` module enabled; a tenantId scopes to just that tenant.
 */
export async function processInventoryLowStockScan(job: Job<InventoryLowStockScanPayload>) {
  const tenantIds = job.data.tenantId
    ? [job.data.tenantId]
    : (await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((t) => t.id);

  let enqueuedCount = 0;

  for (const tenantId of tenantIds) {
    const moduleToggle = await prisma.moduleToggle.findUnique({
      where: { tenantId_moduleKey: { tenantId, moduleKey: "inventory" } },
    });
    if (!moduleToggle?.enabled) {
      continue;
    }

    await withTenant(tenantId, async (tx) => {
      const items = await tx.inventoryItem.findMany({
        where: { deletedAt: null, lowStockAt: { not: null } },
      });

      for (const item of items) {
        if (item.lowStockAt === null || item.quantity > item.lowStockAt) continue;

        const alreadyAlerted = await tx.notificationLog.findFirst({
          where: {
            templateKey: "inventory.lowStock",
            payload: { path: ["itemId"], equals: item.id },
          },
        });
        // ponytail: "has any prior alert ever fired" — same simplification as Unit 57's doc-expiry scan.
        if (alreadyAlerted) continue;

        await enqueue("inventory.lowStockAlert", {
          tenantId,
          branchId: item.branchId,
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
          lowStockAt: item.lowStockAt,
        });
        enqueuedCount += 1;
      }
    });
  }

  return { tenantsScanned: tenantIds.length, alertsEnqueued: enqueuedCount };
}
