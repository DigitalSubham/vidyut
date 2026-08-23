import { withTenant } from "@vidyut/db";
import type { CreateExpenseHeadInput, CreateExpenseInput, ExportAccountingQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createExpenseHead(auth: RequestAuth, input: CreateExpenseHeadInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.expenseHead.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name } })
  );
}

export async function listExpenseHeads(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.expenseHead.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: "asc" } })
  );
}

export async function createExpense(auth: RequestAuth, input: CreateExpenseInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.expense.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        headId: input.headId,
        amount: input.amountPaise,
        vendorName: input.vendorName,
        date: input.date,
        note: input.note,
      },
    })
  );
}

export async function listExpenses(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.expense.findMany({ where: { branchId }, orderBy: { date: "desc" } })
  );
}

export interface AccountingExportRow {
  date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amount: number;
  referenceNo: string;
}

/**
 * Scope #2 — a Tally/Zoho Books CSV export of existing Payment income and
 * logged Expense rows for the period. Plain CSV, not literal Tally XML (see
 * spec's "Decisions made during build") — both target tools accept CSV
 * import. Not verified against a real import (no live account exists here).
 */
export async function exportAccounting(auth: RequestAuth, query: ExportAccountingQueryInput): Promise<AccountingExportRow[]> {
  assertBranchAccess(auth, query.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const [payments, expenses] = await Promise.all([
      tx.payment.findMany({
        where: { branchId: query.branchId, status: "SUCCESS", createdAt: { gte: query.from, lte: query.to } },
        include: { student: { select: { firstName: true, lastName: true } } },
      }),
      tx.expense.findMany({
        where: { branchId: query.branchId, date: { gte: query.from, lte: query.to } },
        include: { head: { select: { name: true } } },
      }),
    ]);

    const incomeRows: AccountingExportRow[] = payments.map((p) => ({
      date: p.createdAt.toISOString().slice(0, 10),
      type: "INCOME",
      category: "Fee Collection",
      description: `${p.student.firstName} ${p.student.lastName} — ${p.mode}`,
      amount: p.amount,
      referenceNo: p.reference ?? p.id,
    }));

    const expenseRows: AccountingExportRow[] = expenses.map((e) => ({
      date: e.date.toISOString().slice(0, 10),
      type: "EXPENSE",
      category: e.head.name,
      description: [e.vendorName, e.note].filter(Boolean).join(" — ") || e.head.name,
      amount: e.amount,
      referenceNo: e.id,
    }));

    return [...incomeRows, ...expenseRows].sort((a, b) => a.date.localeCompare(b.date));
  });
}
