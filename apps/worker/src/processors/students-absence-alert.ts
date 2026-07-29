import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { StudentsAbsenceAlertPayload } from "@vidyut/types";
import { sendPush } from "../providers/push";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);
const PUSH_TITLE = "Attendance";

/**
 * PUSH-then-SMS-fallback (Unit 32's Open Question 3, hardened in Unit 40):
 * a guardian's linked User needs a registered `pushToken` (new this unit —
 * a linked account alone doesn't mean a device is registered) to get a real
 * PUSH attempt; anyone without one falls to SMS. SMS billing reuses Unit
 * 14's SmsWallet-gated debit path (fees-reminder-send.ts) rather than
 * duplicating the wallet-check logic.
 */
export async function processStudentsAbsenceAlert(job: Job<StudentsAbsenceAlertPayload>) {
  const { tenantId, branchId, studentId, date } = job.data;

  return withTenant(tenantId, async (tx) => {
    const guardianLinks = await tx.studentGuardian.findMany({
      where: { studentId, OR: [{ isPrimary: true }, { canPay: true }] },
      include: { guardian: { include: { user: { select: { pushToken: true } } } } },
    });

    let pushSent = 0;
    let smsSent = 0;
    let smsSkipped = 0;

    const message = await resolveTemplateBody(
      tx,
      tenantId,
      "attendance.absence",
      "SMS",
      "Your child was marked absent today.",
      { studentId, date }
    );

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
            templateKey: "attendance.absence",
            toUserId: guardian.userId,
            status: pushResult.sent ? "SENT" : "FAILED",
            payload: { studentId, date, ...(pushResult.error ? { error: pushResult.error } : {}) },
            sentAt: pushResult.sent ? new Date() : undefined,
          },
        });
        if (pushResult.sent) {
          pushSent += 1;
          continue;
        }
        // A configured-but-failed real push still falls through to SMS below.
      }

      if (!guardian.phone) continue;

      const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });
      if ((wallet?.balancePaise ?? 0) < SMS_COST_PAISE) {
        await tx.notificationLog.create({
          data: {
            tenantId,
            branchId,
            channel: "SMS",
            templateKey: "attendance.absence",
            toPhone: guardian.phone,
            status: "FAILED",
            payload: { studentId, date, reason: "insufficient_wallet_balance" },
          },
        });
        smsSkipped += 1;
        continue;
      }

      const smsResult = await sendSms(guardian.phone, message);

      await prisma.$transaction([
        prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: SMS_COST_PAISE } } }),
        prisma.walletTxn.create({
          data: { tenantId, type: "DEBIT", amount: SMS_COST_PAISE, reason: "attendance.absence", referenceId: studentId },
        }),
      ]);

      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "SMS",
          templateKey: "attendance.absence",
          toPhone: guardian.phone,
          status: smsResult.sent || smsResult.stubbed ? "SENT" : "FAILED",
          payload: { studentId, date, ...(smsResult.error ? { error: smsResult.error } : {}) },
          sentAt: smsResult.sent || smsResult.stubbed ? new Date() : undefined,
        },
      });
      smsSent += 1;
    }

    return { pushSent, smsSent, smsSkipped };
  });
}
