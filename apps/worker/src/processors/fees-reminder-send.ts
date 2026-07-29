import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { FeesReminderSendPayload } from "@vidyut/types";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);

/**
 * Sends one fee reminder to one guardian via the real `sendSms` adapter
 * (Unit 40 — falls back to the same honest stub as before when
 * `MSG91_API_KEY` isn't configured, matching this environment's real
 * state), deducting from the tenant's SmsWallet — skips (and logs FAILED)
 * if the balance is insufficient rather than letting it go negative
 * (context/feature-specs/14's Open Questions).
 */
export async function processFeesReminderSend(job: Job<FeesReminderSendPayload>) {
  const { tenantId, branchId, invoiceId, guardianId, phone } = job.data;

  // SmsWallet/WalletTxn carry no RLS (same as Unit 05's platform tables).
  const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });
  const hasBalance = (wallet?.balancePaise ?? 0) >= SMS_COST_PAISE;

  if (!hasBalance) {
    await withTenant(tenantId, (tx) =>
      tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "SMS",
          templateKey: "fee.reminder",
          toPhone: phone,
          status: "FAILED",
          payload: { invoiceId, guardianId, reason: "insufficient_wallet_balance" },
        },
      })
    );
    return { sent: false, reason: "insufficient_wallet_balance" };
  }

  const message = await withTenant(tenantId, (tx) =>
    resolveTemplateBody(tx, tenantId, "fee.reminder", "SMS", "A fee payment is due. Please pay at the earliest.", {
      invoiceId,
    })
  );
  const result = await sendSms(phone, message);

  await prisma.$transaction([
    prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: SMS_COST_PAISE } } }),
    prisma.walletTxn.create({
      data: { tenantId, type: "DEBIT", amount: SMS_COST_PAISE, reason: "fee.reminder", referenceId: invoiceId },
    }),
  ]);

  await withTenant(tenantId, (tx) =>
    tx.notificationLog.create({
      data: {
        tenantId,
        branchId,
        channel: "SMS",
        templateKey: "fee.reminder",
        toPhone: phone,
        status: result.sent || result.stubbed ? "SENT" : "FAILED",
        payload: { invoiceId, guardianId, ...(result.error ? { error: result.error } : {}) },
        sentAt: result.sent || result.stubbed ? new Date() : undefined,
      },
    })
  );

  return { sent: result.sent, stubbed: result.stubbed };
}
