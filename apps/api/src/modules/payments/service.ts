import { nextInvoiceNumber, Prisma, withTenant } from "@vidyut/db";
import type {
  CancelReceiptInput,
  CreateOpeningBalanceInput,
  CreatePaymentInput,
  FeeReportsQueryInput,
  ListInvoicesQueryInput,
  ListPaymentsQueryInput,
  ReconciliationQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { finalizePaymentSuccess } from "./complete-payment";
import { computePeriods } from "./periods";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

// ---------------------------------------------------------------------------
// Invoice generation
// ---------------------------------------------------------------------------

export async function generateInvoicesForStructure(auth: RequestAuth, structureId: string) {
  const structure = await withTenant(auth.tenantId, (tx) =>
    tx.feeStructure.findUnique({ where: { id: structureId } })
  );
  if (!structure || structure.deletedAt) {
    throw new AppError("NOT_FOUND", "fee.errors.structureNotFound");
  }
  assertBranchAccess(auth, structure.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const session = await tx.academicSession.findUnique({ where: { id: structure.sessionId } });
    if (!session) {
      throw new AppError("VALIDATION_ERROR", "fee.errors.sessionNotFound");
    }

    const [items, assignments] = await Promise.all([
      tx.feeStructureItem.findMany({ where: { structureId } }),
      tx.feeAssignment.findMany({ where: { structureId } }),
    ]);

    let invoicesCreated = 0;
    let itemsCreated = 0;

    for (const assignment of assignments) {
      for (const item of items) {
        const periods = computePeriods(item.frequency, session.startDate, session.endDate, item.dueDayOfMonth);

        for (const period of periods) {
          let invoice = await tx.invoice.findUnique({
            where: {
              studentId_sessionId_periodLabel: {
                studentId: assignment.studentId,
                sessionId: structure.sessionId,
                periodLabel: period.periodLabel,
              },
            },
          });

          if (!invoice) {
            const number = await nextInvoiceNumber(tx, structure.branchId);
            invoice = await tx.invoice.create({
              data: {
                tenantId: auth.tenantId,
                branchId: structure.branchId,
                studentId: assignment.studentId,
                sessionId: structure.sessionId,
                number,
                periodLabel: period.periodLabel,
                dueDate: period.dueDate,
              },
            });
            invoicesCreated += 1;
          }

          const existingItem = await tx.invoiceItem.findFirst({
            where: { invoiceId: invoice.id, feeHeadId: item.feeHeadId },
          });
          if (!existingItem) {
            await tx.invoiceItem.create({
              data: {
                tenantId: auth.tenantId,
                invoiceId: invoice.id,
                feeHeadId: item.feeHeadId,
                amount: item.amount,
              },
            });
            itemsCreated += 1;
          }
        }
      }
    }

    return { invoicesCreated, itemsCreated };
  });
}

export async function listInvoices(auth: RequestAuth, query: ListInvoicesQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.InvoiceWhereInput = {
      branchId: query.branchId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.invoice.findMany({
        where,
        include: { items: true },
        orderBy: { dueDate: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.invoice.count({ where }),
    ]);
    return { items, total };
  });
}

async function getInvoiceOrThrow(auth: RequestAuth, id: string) {
  const invoice = await withTenant(auth.tenantId, (tx) =>
    tx.invoice.findUnique({ where: { id }, include: { items: true } })
  );
  if (!invoice) {
    throw new AppError("NOT_FOUND", "fee.errors.invoiceNotFound");
  }
  return invoice;
}

export async function getInvoice(auth: RequestAuth, id: string) {
  const invoice = await getInvoiceOrThrow(auth, id);
  assertBranchAccess(auth, invoice.branchId);
  return invoice;
}

/** Exported for Unit 28's dashboard aggregator — same calculation, not duplicated. */
export function invoiceTotal(items: { amount: number; discount: number; fine: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount - item.discount + item.fine, 0);
}

// ---------------------------------------------------------------------------
// Payments (counter collection, idempotent) + receipt (stub job)
// ---------------------------------------------------------------------------

export async function createPayment(
  auth: RequestAuth,
  input: CreatePaymentInput,
  idempotencyKey: string
): Promise<{ payment: unknown; isReplay: boolean }> {
  assertBranchAccess(auth, input.branchId);

  const existing = await withTenant(auth.tenantId, (tx) =>
    tx.payment.findUnique({ where: { idempotencyKey } })
  );
  if (existing) {
    return { payment: existing, isReplay: true };
  }

  const payment = await withTenant(auth.tenantId, async (tx) => {
    let invoice = null;
    if (input.invoiceId) {
      invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { items: true } });
      if (!invoice || invoice.branchId !== input.branchId) {
        throw new AppError("VALIDATION_ERROR", "fee.errors.invoiceNotFoundInBranch");
      }
    }

    const created = await tx.payment.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        invoiceId: input.invoiceId,
        studentId: input.studentId,
        amount: input.amount,
        mode: input.mode,
        reference: input.reference,
        receivedById: auth.userId,
        idempotencyKey,
      },
    });

    // Fee mutations are ledgered + audited (AGENTS.md invariant #6) —
    // shared with Unit 13's webhook-driven online-payment path.
    await finalizePaymentSuccess(tx, {
      tenantId: auth.tenantId,
      branchId: input.branchId,
      paymentId: created.id,
      invoiceId: input.invoiceId ?? null,
      actorId: auth.userId,
      actorType: "USER",
      action: "payment.create",
      auditAfter: { amount: input.amount, mode: input.mode, invoiceId: input.invoiceId ?? null },
    });

    return created;
  });

  return { payment, isReplay: false };
}

export async function listPayments(auth: RequestAuth, query: ListPaymentsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.PaymentWhereInput = {
      branchId: query.branchId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.payment.count({ where }),
    ]);
    return { items, total };
  });
}

// ---------------------------------------------------------------------------
// Fee ledger (derived, not stored)
// ---------------------------------------------------------------------------

/** Shared by the staff-facing (branch-checked) and Unit 24 self-scope-checked ledger reads — the two differ only in how they authorize, not in what they compute. */
export async function buildStudentFeeLedgerEntries(tx: Prisma.TransactionClient, studentId: string) {
  const [invoices, payments] = await Promise.all([
    tx.invoice.findMany({ where: { studentId }, include: { items: true } }),
    tx.payment.findMany({ where: { studentId } }),
  ]);

  return [
    ...invoices.map((invoice) => ({
      type: "invoice" as const,
      date: invoice.dueDate,
      invoiceId: invoice.id,
      periodLabel: invoice.periodLabel,
      amount: invoiceTotal(invoice.items),
      status: invoice.status,
    })),
    ...payments.map((payment) => ({
      type: "payment" as const,
      date: payment.createdAt,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      mode: payment.mode,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getStudentFeeLedger(auth: RequestAuth, studentId: string) {
  const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: studentId } }));
  if (!student || student.deletedAt) {
    throw new AppError("NOT_FOUND", "student.errors.notFound");
  }
  assertBranchAccess(auth, student.branchId);

  return withTenant(auth.tenantId, (tx) => buildStudentFeeLedgerEntries(tx, studentId));
}

// ---------------------------------------------------------------------------
// Dues / defaulter reports (computed directly, no stored OVERDUE dependency)
// ---------------------------------------------------------------------------

export async function getDuesReport(auth: RequestAuth, query: FeeReportsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const invoices = await tx.invoice.findMany({
      where: {
        branchId: query.branchId,
        status: { notIn: ["CANCELLED"] },
        ...(query.classId
          ? { student: { enrollments: { some: { classId: query.classId } } } }
          : {}),
      },
      include: { items: true, payments: { where: { status: "SUCCESS" } } },
    });

    const byStudent = new Map<string, { studentId: string; outstanding: number }>();
    for (const invoice of invoices) {
      const total = invoiceTotal(invoice.items);
      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = total - paid;
      if (outstanding <= 0) continue;

      const entry = byStudent.get(invoice.studentId) ?? { studentId: invoice.studentId, outstanding: 0 };
      entry.outstanding += outstanding;
      byStudent.set(invoice.studentId, entry);
    }

    return [...byStudent.values()];
  });
}

export async function getDefaultersReport(auth: RequestAuth, query: FeeReportsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const now = new Date();
    const invoices = await tx.invoice.findMany({
      where: {
        branchId: query.branchId,
        status: { notIn: ["PAID", "CANCELLED"] },
        dueDate: { lt: now },
        ...(query.classId
          ? { student: { enrollments: { some: { classId: query.classId } } } }
          : {}),
      },
      include: { items: true, payments: { where: { status: "SUCCESS" } } },
    });

    return invoices
      .map((invoice) => {
        const total = invoiceTotal(invoice.items);
        const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          periodLabel: invoice.periodLabel,
          dueDate: invoice.dueDate,
          outstanding: total - paid,
        };
      })
      .filter((row) => row.outstanding > 0);
  });
}

// ---------------------------------------------------------------------------
// Opening balance (onboarding migration)
// ---------------------------------------------------------------------------

export async function createOpeningBalance(
  auth: RequestAuth,
  studentId: string,
  input: CreateOpeningBalanceInput
) {
  const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: studentId } }));
  if (!student || student.deletedAt) {
    throw new AppError("NOT_FOUND", "student.errors.notFound");
  }
  assertBranchAccess(auth, input.branchId);
  if (student.branchId !== input.branchId) {
    throw new AppError("VALIDATION_ERROR", "fee.errors.studentNotInBranch");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = (await tx.academicSession.findFirst({ where: { branchId: input.branchId, isCurrent: true } }))
      ?.id;
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
    }

    let openingBalanceHead = await tx.feeHead.findUnique({
      where: { branchId_name: { branchId: input.branchId, name: "Opening Balance" } },
    });
    if (!openingBalanceHead) {
      openingBalanceHead = await tx.feeHead.create({
        data: { tenantId: auth.tenantId, branchId: input.branchId, name: "Opening Balance", type: "MISC" },
      });
    }

    const existing = await tx.invoice.findUnique({
      where: { studentId_sessionId_periodLabel: { studentId, sessionId, periodLabel: "Opening Balance" } },
    });
    if (existing) {
      throw new AppError("CONFLICT", "fee.errors.openingBalanceAlreadyExists");
    }

    const number = await nextInvoiceNumber(tx, input.branchId);
    return tx.invoice.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId,
        sessionId,
        number,
        periodLabel: "Opening Balance",
        dueDate: input.dueDate,
        items: {
          create: {
            tenantId: auth.tenantId,
            feeHeadId: openingBalanceHead.id,
            amount: input.amount,
          },
        },
      },
      include: { items: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Unit 38 — Fee Reconciliation & Receipt Corrections
// ---------------------------------------------------------------------------

/** Modes that go through the Unit 13 online-payment/webhook flow — a payment in one of these without a `gatewayOrderId` was recorded manually and never confirmed by the gateway, a real data-quality flag. */
const ONLINE_MODES = ["CARD", "UPI", "NETBANKING", "WALLET"] as const;

export async function getReconciliation(auth: RequestAuth, query: ReconciliationQueryInput) {
  assertBranchAccess(auth, query.branchId);

  // `query.date` is already UTC midnight (Zod's z.coerce.date() on a plain
  // "YYYY-MM-DD" string) — mutate via getTime()/epoch math, never
  // setHours()/setDate(), which reinterpret in the server's local timezone
  // and silently shift the window (a real bug caught by this unit's own
  // test on a UTC+5:30 dev machine).
  const start = new Date(query.date);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return withTenant(auth.tenantId, async (tx) => {
    const payments = await tx.payment.findMany({
      where: {
        branchId: query.branchId,
        status: "SUCCESS",
        createdAt: { gte: start, lt: end },
      },
      include: { receipt: { select: { id: true, number: true, cancelledAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    const online = payments
      .filter((p) => (ONLINE_MODES as readonly string[]).includes(p.mode))
      .map((p) => ({ ...p, needsReview: !p.gatewayOrderId }));
    const counter = payments.filter((p) => !(ONLINE_MODES as readonly string[]).includes(p.mode));

    return { online, counter };
  });
}

async function getReceiptOrThrow(auth: RequestAuth, id: string) {
  const receipt = await withTenant(auth.tenantId, (tx) => tx.receipt.findUnique({ where: { id } }));
  if (!receipt) {
    throw new AppError("NOT_FOUND", "fee.errors.receiptNotFound");
  }
  return receipt;
}

/** Sets `Receipt.cancelledAt`/`cancelReason` only — never touches `Payment`/`Invoice` status (Open Question 2: a human decides separately, via the existing refund flow if money needs to move). Idempotent — cancelling an already-cancelled receipt is a clean no-op, not an error. */
export async function cancelReceipt(auth: RequestAuth, id: string, input: CancelReceiptInput) {
  const receipt = await getReceiptOrThrow(auth, id);
  assertBranchAccess(auth, receipt.branchId);

  if (receipt.cancelledAt) {
    return receipt;
  }

  return withTenant(auth.tenantId, async (tx) => {
    const updated = await tx.receipt.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelReason: input.reason },
    });

    await tx.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        branchId: receipt.branchId,
        actorId: auth.userId,
        action: "receipt.cancel",
        entity: "Receipt",
        entityId: id,
        before: { cancelledAt: null } as Prisma.InputJsonValue,
        after: { cancelledAt: updated.cancelledAt, cancelReason: input.reason } as Prisma.InputJsonValue,
      },
    });

    return updated;
  });
}
