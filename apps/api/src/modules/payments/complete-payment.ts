import type { Prisma } from "@vidyut/db";
import { nextReceiptNumber } from "@vidyut/db";
import { enqueue } from "../../core/jobs";

function invoiceTotal(items: { amount: number; discount: number; fine: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount - item.discount + item.fine, 0);
}

export interface FinalizePaymentSuccessParams {
  tenantId: string;
  branchId: string;
  paymentId: string;
  invoiceId: string | null;
  actorId: string;
  actorType: "USER" | "SYSTEM";
  action: string;
  auditAfter: Record<string, unknown>;
}

/**
 * The shared "a payment succeeded" tail: invoice status recompute, Receipt +
 * receipt.generate enqueue, AuditLog entry (AGENTS.md invariant #6). Unit 12's
 * counter-payment path and Unit 13's webhook path both call this — extracted
 * so the two never drift apart.
 */
export async function finalizePaymentSuccess(
  tx: Prisma.TransactionClient,
  params: FinalizePaymentSuccessParams
): Promise<void> {
  if (params.invoiceId) {
    const invoice = await tx.invoice.findUnique({ where: { id: params.invoiceId }, include: { items: true } });
    if (invoice) {
      const successfulPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: "SUCCESS" },
      });
      const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
      const total = invoiceTotal(invoice.items);
      const status = totalPaid >= total ? "PAID" : totalPaid > 0 ? "PARTIAL" : invoice.status;
      await tx.invoice.update({ where: { id: invoice.id }, data: { status } });
    }
  }

  const receiptNumber = await nextReceiptNumber(tx, params.branchId);
  const receipt = await tx.receipt.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      paymentId: params.paymentId,
      number: receiptNumber,
    },
  });

  await tx.auditLog.create({
    data: {
      tenantId: params.tenantId,
      branchId: params.branchId,
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      entity: "Payment",
      entityId: params.paymentId,
      after: params.auditAfter as Prisma.InputJsonValue,
    },
  });

  await enqueue("receipt.generate", { receiptId: receipt.id });
}
