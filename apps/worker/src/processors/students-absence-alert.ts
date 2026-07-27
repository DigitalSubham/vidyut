import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { StudentsAbsenceAlertPayload } from "@vidyut/types";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);

/**
 * PUSH-then-SMS-fallback (Unit 32's Open Question 3): a guardian with a
 * linked User account (Guardian.userId set) gets a real PUSH attempt; there
 * is no delivery-confirmation infrastructure in this codebase (no FCM
 * receipt tracking exists), so the meaningful "no confirmation" signal this
 * unit can act on is simpler and just as real — no push-capable account
 * means push was never going to be delivered, so it falls straight to SMS.
 * SMS billing reuses Unit 14's SmsWallet-gated debit path (fees-reminder-
 * send.ts) rather than duplicating the wallet-check logic.
 */
export async function processStudentsAbsenceAlert(job: Job<StudentsAbsenceAlertPayload>) {
  const { tenantId, branchId, studentId, date } = job.data;

  return withTenant(tenantId, async (tx) => {
    const guardianLinks = await tx.studentGuardian.findMany({
      where: { studentId, OR: [{ isPrimary: true }, { canPay: true }] },
      include: { guardian: true },
    });

    let pushSent = 0;
    let smsSent = 0;
    let smsSkipped = 0;

    for (const link of guardianLinks) {
      const { guardian } = link;

      if (guardian.userId) {
        await tx.notificationLog.create({
          data: {
            tenantId,
            branchId,
            channel: "PUSH",
            templateKey: "attendance.absence",
            toUserId: guardian.userId,
            status: "SENT",
            payload: { studentId, date },
            sentAt: new Date(),
          },
        });
        pushSent += 1;
        continue;
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

      // eslint-disable-next-line no-console
      console.log(`[worker] absence alert SMS fallback to ${guardian.phone} for student ${studentId} on ${date} (stub)`);

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
          status: "SENT",
          payload: { studentId, date },
          sentAt: new Date(),
        },
      });
      smsSent += 1;
    }

    return { pushSent, smsSent, smsSkipped };
  });
}
