import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { TransportGeofenceAlertPayload } from "@vidyut/types";
import { sendPush } from "../providers/push";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);
const PUSH_TITLE = "Bus arriving";

/**
 * Unit 57 — a location ping crossed a stop's geofence (Unit 57's own
 * `isNewAbsence`-style transition detection in `transport/service.ts`).
 * Alerts every allocated student's guardians. Same PUSH-then-SMS-fallback
 * pipeline as `students-absence-alert.ts` (Unit 32/40) — no new dispatch
 * logic, per the spec's own scope #4.
 */
export async function processTransportGeofenceAlert(job: Job<TransportGeofenceAlertPayload>) {
  const { tenantId, branchId, routeId, stopId } = job.data;

  return withTenant(tenantId, async (tx) => {
    const allocations = await tx.studentRouteAllocation.findMany({ where: { routeId, stopId } });

    let pushSent = 0;
    let smsSent = 0;

    const message = await resolveTemplateBody(
      tx,
      tenantId,
      "transport.pickupDrop",
      "SMS",
      "Your child's bus is arriving at the stop.",
      { routeId, stopId }
    );

    for (const allocation of allocations) {
      const guardianLinks = await tx.studentGuardian.findMany({
        where: { studentId: allocation.studentId, OR: [{ isPrimary: true }, { canPay: true }] },
        include: { guardian: { include: { user: { select: { pushToken: true } } } } },
      });

      for (const link of guardianLinks) {
        const { guardian } = link;
        const pushToken = guardian.user?.pushToken ?? null;

        if (guardian.userId && pushToken) {
          const pushResult = await sendPush(pushToken, PUSH_TITLE, message);
          await tx.notificationLog.create({
            data: {
              tenantId,
              branchId,
              channel: "PUSH",
              templateKey: "transport.pickupDrop",
              toUserId: guardian.userId,
              status: pushResult.sent ? "SENT" : "FAILED",
              payload: { studentId: allocation.studentId, routeId, stopId },
              sentAt: pushResult.sent ? new Date() : undefined,
            },
          });
          if (pushResult.sent) {
            pushSent += 1;
            continue;
          }
        }

        if (!guardian.phone) continue;

        const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });
        if ((wallet?.balancePaise ?? 0) < SMS_COST_PAISE) {
          await tx.notificationLog.create({
            data: {
              tenantId,
              branchId,
              channel: "SMS",
              templateKey: "transport.pickupDrop",
              toPhone: guardian.phone,
              status: "FAILED",
              payload: { studentId: allocation.studentId, reason: "insufficient_wallet_balance" },
            },
          });
          continue;
        }

        const smsResult = await sendSms(guardian.phone, message);
        await prisma.$transaction([
          prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: SMS_COST_PAISE } } }),
          prisma.walletTxn.create({
            data: { tenantId, type: "DEBIT", amount: SMS_COST_PAISE, reason: "transport.pickupDrop", referenceId: allocation.studentId },
          }),
        ]);
        await tx.notificationLog.create({
          data: {
            tenantId,
            branchId,
            channel: "SMS",
            templateKey: "transport.pickupDrop",
            toPhone: guardian.phone,
            status: smsResult.sent || smsResult.stubbed ? "SENT" : "FAILED",
            payload: { studentId: allocation.studentId, routeId, stopId },
            sentAt: smsResult.sent || smsResult.stubbed ? new Date() : undefined,
          },
        });
        smsSent += 1;
      }
    }

    return { pushSent, smsSent };
  });
}
