import { getCurrentSessionId, nextInvoiceNumber, withTenant } from "@vidyut/db";
import type {
  CreateBookCopyInput,
  CreateBookInput,
  CreateBookIssueInput,
  CreateLibraryMemberInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

const LOAN_DAYS = 14;
const RENEWAL_DAYS = 14;
/** ponytail: a flat per-day fine, not per-tenant configurable — add a config knob if a school asks. */
const FINE_PER_DAY_PAISE = 200;

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createBook(auth: RequestAuth, input: CreateBookInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.book.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, title: input.title, author: input.author, isbn: input.isbn },
    })
  );
}

export async function listBooks(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.book.findMany({ where: { branchId, deletedAt: null }, orderBy: { title: "asc" } })
  );
}

async function getBookOrThrow(auth: RequestAuth, bookId: string) {
  const book = await withTenant(auth.tenantId, (tx) => tx.book.findUnique({ where: { id: bookId } }));
  if (!book) {
    throw new AppError("NOT_FOUND", "library.errors.bookNotFound");
  }
  return book;
}

export async function createBookCopy(auth: RequestAuth, bookId: string, input: CreateBookCopyInput) {
  const book = await getBookOrThrow(auth, bookId);
  assertBranchAccess(auth, book.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.bookCopy.create({
      data: { tenantId: auth.tenantId, branchId: book.branchId, bookId, barcode: input.barcode },
    })
  );
}

export async function listBookCopies(auth: RequestAuth, bookId: string) {
  const book = await getBookOrThrow(auth, bookId);
  assertBranchAccess(auth, book.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.bookCopy.findMany({ where: { bookId, deletedAt: null }, orderBy: { barcode: "asc" } })
  );
}

/** Scope #2 — a link row only, not a new identity. Exactly one of studentId/staffId (validation layer). */
export async function createLibraryMember(auth: RequestAuth, input: CreateLibraryMemberInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.libraryMember.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, studentId: input.studentId, staffId: input.staffId },
    })
  );
}

export async function listLibraryMembers(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.libraryMember.findMany({ where: { branchId, deletedAt: null }, orderBy: { createdAt: "desc" } })
  );
}

export async function createBookIssue(auth: RequestAuth, input: CreateBookIssueInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const copy = await tx.bookCopy.findUnique({ where: { id: input.copyId } });
    if (!copy) {
      throw new AppError("NOT_FOUND", "library.errors.copyNotFound");
    }
    assertBranchAccess(auth, copy.branchId);
    if (copy.status !== "AVAILABLE") {
      throw new AppError("VALIDATION_ERROR", "library.errors.copyNotAvailable");
    }

    const member = await tx.libraryMember.findUnique({ where: { id: input.memberId } });
    if (!member || member.branchId !== copy.branchId) {
      throw new AppError("VALIDATION_ERROR", "library.errors.memberNotInBranch");
    }

    const dueAt = input.dueAt ?? new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000);

    const [issue] = await Promise.all([
      tx.bookIssue.create({
        data: { tenantId: auth.tenantId, branchId: copy.branchId, copyId: copy.id, memberId: member.id, dueAt },
      }),
      tx.bookCopy.update({ where: { id: copy.id }, data: { status: "ISSUED" } }),
    ]);

    return issue;
  });
}

export async function listBookIssues(auth: RequestAuth, memberId?: string, activeOnly?: boolean) {
  return withTenant(auth.tenantId, (tx) =>
    tx.bookIssue.findMany({
      where: { ...(memberId ? { memberId } : {}), ...(activeOnly ? { returnedAt: null } : {}) },
      orderBy: { issuedAt: "desc" },
    })
  );
}

async function getIssueOrThrow(auth: RequestAuth, issueId: string) {
  const issue = await withTenant(auth.tenantId, (tx) => tx.bookIssue.findUnique({ where: { id: issueId } }));
  if (!issue) {
    throw new AppError("NOT_FOUND", "library.errors.issueNotFound");
  }
  return issue;
}

export async function renewBookIssue(auth: RequestAuth, issueId: string) {
  const issue = await getIssueOrThrow(auth, issueId);
  assertBranchAccess(auth, issue.branchId);
  if (issue.returnedAt) {
    throw new AppError("VALIDATION_ERROR", "library.errors.alreadyReturned");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.bookIssue.update({
      where: { id: issueId },
      data: { dueAt: new Date(Date.now() + RENEWAL_DAYS * 24 * 60 * 60 * 1000) },
    })
  );
}

/**
 * Open Question 2 — an overdue return generates a one-off Invoice/InvoiceItem
 * on a MISC FeeHead (Unit 12's existing engine), not a parallel fine ledger.
 * Only student members can be billed — Invoice.studentId is a hard FK and
 * there's no staff fee ledger to attach a staff fine to (see spec's
 * "Decisions made during build").
 */
export async function returnBookIssue(auth: RequestAuth, issueId: string) {
  const issue = await getIssueOrThrow(auth, issueId);
  assertBranchAccess(auth, issue.branchId);
  if (issue.returnedAt) {
    throw new AppError("VALIDATION_ERROR", "library.errors.alreadyReturned");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const returnedAt = new Date();
    const overdueDays = Math.max(0, Math.ceil((returnedAt.getTime() - issue.dueAt.getTime()) / (24 * 60 * 60 * 1000)));

    let fineInvoiceId: string | null = null;

    if (overdueDays > 0) {
      const member = await tx.libraryMember.findUnique({ where: { id: issue.memberId } });
      if (member?.studentId) {
        const sessionId = await getCurrentSessionId(tx, issue.branchId);
        if (sessionId) {
          const feeHead =
            (await tx.feeHead.findFirst({ where: { branchId: issue.branchId, type: "MISC" } })) ??
            (await tx.feeHead.create({
              data: { tenantId: auth.tenantId, branchId: issue.branchId, name: "Library Fine", type: "MISC" },
            }));

          const number = await nextInvoiceNumber(tx, issue.branchId);
          const invoice = await tx.invoice.create({
            data: {
              tenantId: auth.tenantId,
              branchId: issue.branchId,
              studentId: member.studentId,
              sessionId,
              number,
              periodLabel: `LIBRARY-FINE-${issue.id}`,
              dueDate: returnedAt,
              items: {
                create: {
                  tenantId: auth.tenantId,
                  feeHeadId: feeHead.id,
                  amount: overdueDays * FINE_PER_DAY_PAISE,
                },
              },
            },
          });
          fineInvoiceId = invoice.id;
        }
      }
    }

    const [updated] = await Promise.all([
      tx.bookIssue.update({ where: { id: issueId }, data: { returnedAt, fineInvoiceId } }),
      tx.bookCopy.update({ where: { id: issue.copyId }, data: { status: "AVAILABLE" } }),
    ]);

    return updated;
  });
}
