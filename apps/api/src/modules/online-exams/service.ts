import { getCurrentSessionId, withTenant } from "@vidyut/db";
import type {
  AddOnlineExamQuestionFromBankInput,
  AddOnlineExamQuestionInput,
  CreateOnlineExamInput,
  ListOnlineExamsQueryInput,
  SubmitOnlineExamInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { resolveSelfStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";
import { getQuestionBankItemOrThrow } from "../question-bank/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

async function getOnlineExamOrThrow(auth: RequestAuth, id: string) {
  const exam = await withTenant(auth.tenantId, (tx) => tx.onlineExam.findUnique({ where: { id } }));
  if (!exam) {
    throw new AppError("NOT_FOUND", "exam.errors.onlineExamNotFound");
  }
  return exam;
}

export async function createOnlineExam(auth: RequestAuth, input: CreateOnlineExamInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExam.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        classId: input.classId,
        subjectId: input.subjectId,
        title: input.title,
        durationMinutes: input.durationMinutes,
        startAt: input.startAt,
        endAt: input.endAt,
        createdById: auth.userId,
      },
    })
  );
}

export async function listOnlineExams(auth: RequestAuth, query: ListOnlineExamsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      ...(query.classId ? { classId: query.classId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.onlineExam.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.onlineExam.count({ where }),
    ]);
    return { items, total };
  });
}

export async function publishOnlineExam(auth: RequestAuth, id: string) {
  const exam = await getOnlineExamOrThrow(auth, id);
  assertBranchAccess(auth, exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExam.update({ where: { id }, data: { isPublished: true } })
  );
}

async function nextQuestionOrder(auth: RequestAuth, onlineExamId: string): Promise<number> {
  const count = await withTenant(auth.tenantId, (tx) => tx.onlineExamQuestion.count({ where: { onlineExamId } }));
  return count;
}

export async function addOnlineExamQuestion(auth: RequestAuth, examId: string, input: AddOnlineExamQuestionInput) {
  const exam = await getOnlineExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);
  if (exam.isPublished) {
    throw new AppError("CONFLICT", "exam.errors.onlineExamPublished");
  }
  if (input.correctOptionIndex >= input.options.length) {
    throw new AppError("VALIDATION_ERROR", "exam.errors.correctOptionIndexOutOfRange");
  }

  const order = await nextQuestionOrder(auth, examId);
  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExamQuestion.create({
      data: {
        tenantId: auth.tenantId,
        onlineExamId: examId,
        questionText: input.questionText,
        options: input.options,
        correctOptionIndex: input.correctOptionIndex,
        marks: input.marks,
        order,
      },
    })
  );
}

/** Copies the bank item's content into a new OnlineExamQuestion row rather
 * than referencing it — a later edit to the bank item must never silently
 * change a question already in an exam (context/feature-specs/46's scope #6). */
export async function addOnlineExamQuestionFromBank(
  auth: RequestAuth,
  examId: string,
  input: AddOnlineExamQuestionFromBankInput
) {
  const exam = await getOnlineExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);
  if (exam.isPublished) {
    throw new AppError("CONFLICT", "exam.errors.onlineExamPublished");
  }

  const bankItem = await getQuestionBankItemOrThrow(auth, input.questionBankItemId);
  const order = await nextQuestionOrder(auth, examId);
  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExamQuestion.create({
      data: {
        tenantId: auth.tenantId,
        onlineExamId: examId,
        questionText: bankItem.questionText,
        options: bankItem.options as object,
        correctOptionIndex: bankItem.correctOptionIndex,
        marks: input.marks,
        order,
      },
    })
  );
}

export async function listOnlineExamQuestions(auth: RequestAuth, examId: string, includeAnswers: boolean) {
  const exam = await getOnlineExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExamQuestion.findMany({
      where: { onlineExamId: examId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        questionText: true,
        options: true,
        marks: true,
        order: true,
        ...(includeAnswers ? { correctOptionIndex: true } : {}),
      },
    })
  );
}

/** PARENT/STUDENT only — a caller may only submit against their own child. */
async function assertOwnStudent(auth: RequestAuth, studentId: string): Promise<void> {
  const ownIds = await resolveSelfStudentIds(auth);
  if (!ownIds.includes(studentId)) {
    throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
  }
}

/** MCQ-only auto-grading (Open Question 1) — score is a straight sum of
 * per-question marks where the submitted answer matches the stored
 * correctOptionIndex, positionally aligned to question order. */
export async function submitOnlineExam(auth: RequestAuth, examId: string, input: SubmitOnlineExamInput) {
  await assertOwnStudent(auth, input.studentId);
  const exam = await getOnlineExamOrThrow(auth, examId);
  if (!exam.isPublished) {
    throw new AppError("VALIDATION_ERROR", "exam.errors.onlineExamNotPublished");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: { studentId: input.studentId, classId: exam.classId },
    });
    if (!enrollment) {
      throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
    }

    const existing = await tx.onlineExamSubmission.findUnique({
      where: { onlineExamId_studentId: { onlineExamId: examId, studentId: input.studentId } },
    });
    if (existing) {
      throw new AppError("CONFLICT", "exam.errors.alreadySubmitted");
    }

    const questions = await tx.onlineExamQuestion.findMany({
      where: { onlineExamId: examId },
      orderBy: { order: "asc" },
    });

    let score = 0;
    let maxScore = 0;
    questions.forEach((question, index) => {
      maxScore += question.marks;
      if (input.answers[index] === question.correctOptionIndex) {
        score += question.marks;
      }
    });

    return tx.onlineExamSubmission.create({
      data: {
        tenantId: auth.tenantId,
        onlineExamId: examId,
        studentId: input.studentId,
        answers: input.answers,
        score,
        maxScore,
      },
    });
  });
}

/** Self-scoped, answer-key stripped — what a student actually sees to take
 * the exam (distinct from the staff-facing listOnlineExamQuestions above). */
export async function getOnlineExamForStudent(auth: RequestAuth, examId: string, studentId: string) {
  await assertOwnStudent(auth, studentId);
  const exam = await getOnlineExamOrThrow(auth, examId);
  if (!exam.isPublished) {
    throw new AppError("VALIDATION_ERROR", "exam.errors.onlineExamNotPublished");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const enrollment = await tx.enrollment.findFirst({ where: { studentId, classId: exam.classId } });
    if (!enrollment) {
      throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
    }
    const questions = await tx.onlineExamQuestion.findMany({
      where: { onlineExamId: examId },
      orderBy: { order: "asc" },
      select: { id: true, questionText: true, options: true, marks: true, order: true },
    });
    return { exam, questions };
  });
}

export async function listOnlineExamSubmissions(auth: RequestAuth, examId: string) {
  const exam = await getOnlineExamOrThrow(auth, examId);
  assertBranchAccess(auth, exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.onlineExamSubmission.findMany({ where: { onlineExamId: examId }, orderBy: { submittedAt: "desc" } })
  );
}

/** Self-scoped discovery — `GET /online-exams?branchId=` requires branch
 * access a PARENT/STUDENT token doesn't carry (they have no BranchIds), so
 * without this a student has no way to find out which online exams exist
 * for their own class. Resolves the student's current-session class from
 * their enrollment, same pattern as me/service.ts's resolveCurrentSectionId,
 * and folds in each exam's own submission (if any) so the mobile app can
 * show "already taken — score X" instead of "take" for a finished exam. */
export async function listMyOnlineExams(auth: RequestAuth, studentId: string) {
  await assertOwnStudent(auth, studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new AppError("NOT_FOUND", "student.errors.notFound");
    }
    const sessionId = await getCurrentSessionId(tx, student.branchId);
    if (!sessionId) {
      return [];
    }
    const enrollment = await tx.enrollment.findFirst({ where: { studentId, sessionId } });
    if (!enrollment) {
      return [];
    }

    const exams = await tx.onlineExam.findMany({
      where: { classId: enrollment.classId, isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    const submissions = await tx.onlineExamSubmission.findMany({
      where: { onlineExamId: { in: exams.map((e) => e.id) }, studentId },
    });
    const submissionByExamId = new Map(submissions.map((s) => [s.onlineExamId, s]));

    return exams.map((exam) => {
      const submission = submissionByExamId.get(exam.id);
      return {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        submitted: !!submission,
        score: submission?.score,
        maxScore: submission?.maxScore,
      };
    });
  });
}
