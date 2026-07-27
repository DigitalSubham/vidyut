import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma, withTenant } from "@vidyut/db";
import type {
  CreateRefundRequestInput,
  DecideRefundRequestInput,
  InitiateOnlinePaymentInput,
  ListRefundRequestsQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { resolveGuardianStudentIds } from "../../core/guards/require-self";
import { userHasPermission } from "../../core/guards/require-permission";
import type { RequestAuth } from "../../core/guards/types";
import { requireModuleEnabled } from "../../core/entitlements";
import { config } from "../../core/config";
import { finalizePaymentSuccess } from "../payments/complete-payment";
import { createStubOrder } from "./gateway";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function initiateOnlinePayment(auth: RequestAuth, input: InitiateOnlinePaymentInput) {
  await requireModuleEnabled(auth.tenantId, "online_payment");

  if (auth.roles.includes("PARENT")) {
    // A PARENT has no BranchMembership (self-scope only, not branch-scoped)
    // — authorization here is entirely "is this your own linked child."
    const ownStudentIds = await resolveGuardianStudentIds(auth.tenantId, auth.userId);
    if (!ownStudentIds.includes(input.studentId)) {
      throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
    }
  } else {
    assertBranchAccess(auth, input.branchId);
    const allowed = await userHasPermission(auth, "fees.collect");
    if (!allowed) {
      throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
    }
  }

  const platformFeeAmount = Math.round((input.amount * config.payments.platformFeeBps) / 10_000);

  return withTenant(auth.tenantId, async (tx) => {
    if (input.invoiceId) {
      const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId } });
      if (!invoice || invoice.branchId !== input.branchId) {
        throw new AppError("VALIDATION_ERROR", "fee.errors.invoiceNotFoundInBranch");
      }
    }

    // idempotencyKey is unique per Payment; an online-initiated payment
    // doesn't take a client-supplied key (no counter-collection retry
    // scenario), so a fresh one is generated per initiation attempt.
    const payment = await tx.payment.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        invoiceId: input.invoiceId,
        studentId: input.studentId,
        amount: input.amount,
        mode: input.mode,
        status: "PENDING",
        platformFeeAmount,
        idempotencyKey: `online:${auth.tenantId}:${randomUUID()}`,
      },
    });

    const order = createStubOrder({ tenantId: auth.tenantId, paymentId: payment.id });
    await tx.payment.update({ where: { id: payment.id }, data: { gatewayOrderId: order.gatewayOrderId } });

    return { paymentId: payment.id, gatewayOrderId: order.gatewayOrderId, amount: input.amount };
  });
}

function verifyRazorpaySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) {
    return false;
  }
  const expected = createHmac("sha256", config.payments.razorpayWebhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

export interface RazorpayWebhookBody {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        notes?: { tenantId?: string; paymentId?: string };
      };
    };
  };
}

/** Real signature verification (context/feature-specs/13's Decisions) — the only stubbed piece is order creation. */
export async function handleRazorpayWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  body: RazorpayWebhookBody
): Promise<void> {
  if (!verifyRazorpaySignature(rawBody, signatureHeader)) {
    throw new AppError("VALIDATION_ERROR", "fee.errors.invalidWebhookSignature");
  }

  const notes = body.payload.payment.entity.notes;
  const tenantId = notes?.tenantId;
  const paymentId = notes?.paymentId;
  if (!tenantId || !paymentId) {
    throw new AppError("VALIDATION_ERROR", "fee.errors.webhookMissingNotes");
  }

  await withTenant(tenantId, async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.tenantId !== tenantId) {
      throw new AppError("NOT_FOUND", "fee.errors.paymentNotFound");
    }

    if (body.event === "payment.captured") {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS" } });
      await finalizePaymentSuccess(tx, {
        tenantId,
        branchId: payment.branchId,
        paymentId,
        invoiceId: payment.invoiceId,
        actorId: "razorpay-webhook",
        actorType: "SYSTEM",
        action: "payment.webhookCaptured",
        auditAfter: { amount: payment.amount, mode: payment.mode, invoiceId: payment.invoiceId },
      });
    } else if (body.event === "payment.failed") {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
    }
  });
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export async function createRefundRequest(
  auth: RequestAuth,
  paymentId: string,
  input: CreateRefundRequestInput
) {
  const payment = await withTenant(auth.tenantId, (tx) => tx.payment.findUnique({ where: { id: paymentId } }));
  if (!payment) {
    throw new AppError("NOT_FOUND", "fee.errors.paymentNotFound");
  }
  assertBranchAccess(auth, payment.branchId);
  if (payment.status !== "SUCCESS") {
    throw new AppError("VALIDATION_ERROR", "fee.errors.paymentNotRefundable");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.refundRequest.create({
      data: {
        tenantId: auth.tenantId,
        branchId: payment.branchId,
        paymentId,
        amount: input.amount,
        reason: input.reason,
        requestedById: auth.userId,
      },
    })
  );
}

export async function listRefundRequests(auth: RequestAuth, query: ListRefundRequestsQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      ...(query.paymentId ? { paymentId: query.paymentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.refundRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.refundRequest.count({ where }),
    ]);
    return { items, total };
  });
}

export async function decideRefundRequest(auth: RequestAuth, id: string, input: DecideRefundRequestInput) {
  const refundRequest = await withTenant(auth.tenantId, (tx) => tx.refundRequest.findUnique({ where: { id } }));
  if (!refundRequest) {
    throw new AppError("NOT_FOUND", "fee.errors.refundRequestNotFound");
  }
  assertBranchAccess(auth, refundRequest.branchId);
  if (refundRequest.status !== "PENDING") {
    throw new AppError("CONFLICT", "fee.errors.refundRequestNotPending");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const updated = await tx.refundRequest.update({
      where: { id },
      data: { status: input.status, decidedById: auth.userId },
    });

    if (input.status === "APPROVED") {
      // Gateway refund call is stubbed, same as order creation (context/feature-specs/13's Decisions).
      const payment = await tx.payment.update({
        where: { id: refundRequest.paymentId },
        data: { status: "REFUNDED" },
      });

      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          include: { items: true },
        });
        if (invoice) {
          const successfulPayments = await tx.payment.findMany({
            where: { invoiceId: invoice.id, status: "SUCCESS" },
          });
          const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
          const total = invoice.items.reduce((sum, item) => sum + item.amount - item.discount + item.fine, 0);
          const status = totalPaid >= total ? "PAID" : totalPaid > 0 ? "PARTIAL" : "PENDING";
          await tx.invoice.update({ where: { id: invoice.id }, data: { status } });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          branchId: refundRequest.branchId,
          actorId: auth.userId,
          action: "payment.refund",
          entity: "Payment",
          entityId: refundRequest.paymentId,
          after: { amount: refundRequest.amount, reason: refundRequest.reason } as Prisma.InputJsonValue,
        },
      });
    }

    return updated;
  });
}
