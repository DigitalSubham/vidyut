import type { Job } from "bullmq";
import { withTenant } from "@vidyut/db";
import type { TransportExpiryAlertPayload } from "@vidyut/types";

/**
 * Unit 57 — an internal ops alert (vehicle document expiring), not a
 * parent-facing one, so it's IN_APP-only (Unit 40's existing inbox) rather
 * than PUSH/SMS — no wallet cost for an internal reminder.
 */
export async function processTransportExpiryAlert(job: Job<TransportExpiryAlertPayload>) {
  const { tenantId, branchId, vehicleId, regNo, docType, expiryDate } = job.data;

  return withTenant(tenantId, async (tx) => {
    const owners = await tx.userRole.findMany({
      where: { role: { key: "OWNER" } },
      select: { userId: true },
    });

    let sent = 0;
    for (const owner of owners) {
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "IN_APP",
          templateKey: "transport.docExpiry",
          toUserId: owner.userId,
          status: "SENT",
          payload: { vehicleId, regNo, docType, expiryDate },
          sentAt: new Date(),
        },
      });
      sent += 1;
    }

    return { sent };
  });
}
