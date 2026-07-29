import { withTenant } from "@vidyut/db";
import type { CreateQuestionBankItemInput, ListQuestionBankQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createQuestionBankItem(auth: RequestAuth, input: CreateQuestionBankItemInput) {
  assertBranchAccess(auth, input.branchId);
  if (input.correctOptionIndex >= input.options.length) {
    throw new AppError("VALIDATION_ERROR", "exam.errors.correctOptionIndexOutOfRange");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.questionBankItem.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        classId: input.classId,
        subjectId: input.subjectId,
        questionText: input.questionText,
        options: input.options,
        correctOptionIndex: input.correctOptionIndex,
      },
    })
  );
}

export async function listQuestionBankItems(auth: RequestAuth, query: ListQuestionBankQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.questionBankItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.questionBankItem.count({ where }),
    ]);
    return { items, total };
  });
}

export async function getQuestionBankItemOrThrow(auth: RequestAuth, id: string) {
  const item = await withTenant(auth.tenantId, (tx) => tx.questionBankItem.findUnique({ where: { id } }));
  if (!item) {
    throw new AppError("NOT_FOUND", "exam.errors.questionBankItemNotFound");
  }
  return item;
}
