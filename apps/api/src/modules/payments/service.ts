import { nextInvoiceNumber, Prisma, withTenant } from "@vidyut/db";
import type {
  CreateOpeningBalanceInput,
  CreatePaymentInput,
  FeeReportsQueryInput,
  ListInvoicesQueryInput,
  ListPaymentsQueryInput,
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
