import { withTenant } from "@vidyut/db";
import type {
  CreateExamInput,
  CreateExamSubjectInput,
  ListExamsQueryInput,
  PatchExamInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

async function getExamOrThrow(auth: RequestAuth, id: string) {
  const exam = await withTenant(auth.tenantId, (tx) => tx.exam.findUnique({ where: { id } }));
  if (!exam || exam.deletedAt) {
    throw new AppError("NOT_FOUND", "exam.errors.examNotFound");
  }
  return exam;
}

function assertNotLocked(exam: { isLocked: boolean }): void {
  if (exam.isLocked) {
    throw new AppError("CONFLICT", "exam.errors.examLocked");
  }
}

export async function createExam(auth: RequestAuth, input: CreateExamInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const session = await tx.academicSession.findUnique({ where: { id: input.sessionId } });
    if (!session || session.branchId !== input.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.sessionNotFoundInBranch");
    }

    return tx.exam.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        sessionId: input.sessionId,
        name: input.name,
        type: input.type,
        gradingScheme: input.gradingScheme,
        startDate: input.startDate,
      },
    });
  });
}

export async function listExams(auth: RequestAuth, query: ListExamsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      deletedAt: null,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.exam.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.exam.count({ where }),
    ]);
    return { items, total };
  });
}

export async function patchExam(auth: RequestAuth, id: string, input: PatchExamInput) {
  const exam = await getExamOrThrow(auth, id);
  assertBranchAccess(auth, exam.branchId);

  // Unlocking is itself a deliberate PATCH (input.isLocked === false) and is
  // always allowed; any other field change on an already-locked exam is not
  // (context/feature-specs/17's scope #2 — locking freezes the structure).
  const isUnlockOnly = exam.isLocked && input.isLocked === false && Object.keys(input).length === 1;
  if (exam.isLocked && !isUnlockOnly) {
    assertNotLocked(exam);
  }

  return withTenant(auth.tenantId, (tx) => tx.exam.update({ where: { id }, data: input }));
}

export async function deleteExam(auth: RequestAuth, id: string): Promise<void> {
  const exam = await getExamOrThrow(auth, id);
  assertBranchAccess(auth, exam.branchId);
  assertNotLocked(exam);

  await withTenant(auth.tenantId, (tx) => tx.exam.update({ where: { id }, data: { deletedAt: new Date() } }));
}

export async function createExamSubject(auth: RequestAuth, examId: string, input: CreateExamSubjectInput) {
  const exam = await getExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);
  assertNotLocked(exam);

  return withTenant(auth.tenantId, async (tx) => {
    const [cls, subject] = await Promise.all([
      tx.class.findUnique({ where: { id: input.classId } }),
      tx.subject.findUnique({ where: { id: input.subjectId } }),
    ]);
    if (!cls || cls.deletedAt || cls.branchId !== exam.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.classNotFoundInBranch");
    }
    if (!subject || subject.deletedAt || subject.branchId !== exam.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.subjectNotFoundInBranch");
    }

    return tx.examSubject.create({
      data: {
        tenantId: auth.tenantId,
        examId,
        classId: input.classId,
        subjectId: input.subjectId,
        maxMarks: input.maxMarks,
        passMarks: input.passMarks,
        weightage: input.weightage,
      },
    });
  });
}

export async function listExamSubjects(auth: RequestAuth, examId: string) {
  const exam = await getExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.examSubject.findMany({ where: { examId }, include: { class: true, subject: true } })
  );
}

export async function deleteExamSubject(auth: RequestAuth, examId: string, id: string): Promise<void> {
  const exam = await getExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);
  assertNotLocked(exam);

  const examSubject = await withTenant(auth.tenantId, (tx) => tx.examSubject.findUnique({ where: { id } }));
  if (!examSubject || examSubject.examId !== examId) {
    throw new AppError("NOT_FOUND", "exam.errors.examSubjectNotFound");
  }

  await withTenant(auth.tenantId, (tx) => tx.examSubject.delete({ where: { id } }));
}
