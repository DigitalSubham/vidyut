import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { FrontofficeGatePassAlertPayload } from "@vidyut/types";
import { sendPush } from "../providers/push";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);
const PUSH_TITLE = "Gate pass approved";

/**
 * Unit 60 scope #2 — a gate pass was approved; alerts the student's
 * guardians. Same PUSH-then-SMS-fallback pipeline as
 * `students-absence-alert.ts`/`transport-geofence-alert.ts` (Unit 32/40) —
 * no new dispatch logic.
 */
export async function processFrontofficeGatePassAlert(job: Job<FrontofficeGatePassAlertPayload>) {
  const { tenantId, branchId, studentId, gatePassId, reason } = job.data;

  return withTenant(tenantId, async (tx) => {
    const guardianLinks = await tx.studentGuardian.findMany({
      where: { studentId, OR: [{ isPrimary: true }, { canPay: true }] },
      include: { guardian: { include: { user: { select: { pushToken: true } } } } },
    });

    const message = await resolveTemplateBody(
      tx,
      tenantId,
      "frontoffice.gatePass",
      "SMS",
      `Gate pass approved: ${reason}`,
      { studentId, gatePassId }
    );

    let pushSent = 0;
    let smsSent = 0;

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
            templateKey: "frontoffice.gatePass",
            toUserId: guardian.userId,
            status: pushResult.sent ? "SENT" : "FAILED",
            payload: { studentId, gatePassId },
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
            templateKey: "frontoffice.gatePass",
            toPhone: guardian.phone,
            status: "FAILED",
            payload: { studentId, reason: "insufficient_wallet_balance" },
          },
        });
        continue;
      }

      const smsResult = await sendSms(guardian.phone, message);
      await prisma.$transaction([
        prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: SMS_COST_PAISE } } }),
        prisma.walletTxn.create({
          data: { tenantId, type: "DEBIT", amount: SMS_COST_PAISE, reason: "frontoffice.gatePass", referenceId: studentId },
        }),
      ]);
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "SMS",
          templateKey: "frontoffice.gatePass",
          toPhone: guardian.phone,
          status: smsResult.sent || smsResult.stubbed ? "SENT" : "FAILED",
          payload: { studentId, gatePassId },
          sentAt: smsResult.sent || smsResult.stubbed ? new Date() : undefined,
        },
      });
      smsSent += 1;
    }

    return { pushSent, smsSent };
  });
}
