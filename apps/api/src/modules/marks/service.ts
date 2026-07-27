import { withTenant } from "@vidyut/db";
import type { BulkEnterMarksInput, ListMarksQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getStaffByUserId } from "../staff/service";
import { computeGrade } from "./grading";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

async function getExamSubjectOrThrow(auth: RequestAuth, id: string) {
  const examSubject = await withTenant(auth.tenantId, (tx) =>
    tx.examSubject.findUnique({ where: { id }, include: { exam: true } })
  );
  if (!examSubject) {
    throw new AppError("NOT_FOUND", "exam.errors.examSubjectNotFound");
  }
  return examSubject;
}

/** A TEACHER may only enter marks for an ExamSubject whose class they're assigned to teach that subject in. PRINCIPAL isn't class-restricted. */
async function assertCanEnterMarks(auth: RequestAuth, classId: string, subjectId: string): Promise<void> {
  if (auth.roles.some((r) => r === "PRINCIPAL" || r === "ADMIN" || r === "OWNER")) {
    return;
  }

  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
  }

  const assigned = await withTenant(auth.tenantId, (tx) =>
    tx.teacherAssignment.findFirst({
      where: { staffId: staff.id, subjectId, section: { classId } },
    })
  );
  if (!assigned) {
    throw new AppError("FORBIDDEN", "auth.errors.sectionForbidden");
  }
}

export async function bulkEnterMarks(auth: RequestAuth, input: BulkEnterMarksInput) {
  const examSubject = await getExamSubjectOrThrow(auth, input.examSubjectId);
  assertBranchAccess(auth, examSubject.exam.branchId);
  await assertCanEnterMarks(auth, examSubject.classId, examSubject.subjectId);

  return withTenant(auth.tenantId, async (tx) => {
    const saved = [];
    for (const entry of input.entries) {
      if (entry.marks !== undefined && entry.marks > examSubject.maxMarks) {
        throw new AppError("VALIDATION_ERROR", "marks.errors.marksExceedMax");
      }

      const existing = await tx.marksEntry.findUnique({
        where: { examSubjectId_studentId: { examSubjectId: input.examSubjectId, studentId: entry.studentId } },
      });
      if (existing?.lockedAt) {
        throw new AppError("CONFLICT", "marks.errors.entryLocked");
      }

      const grade = entry.isAbsent
        ? null
        : computeGrade(examSubject.exam.gradingScheme, entry.marks, examSubject.maxMarks);

      const row = await tx.marksEntry.upsert({
        where: { examSubjectId_studentId: { examSubjectId: input.examSubjectId, studentId: entry.studentId } },
        create: {
          tenantId: auth.tenantId,
          branchId: examSubject.exam.branchId,
          examSubjectId: input.examSubjectId,
          studentId: entry.studentId,
          marks: entry.isAbsent ? null : entry.marks,
          grade,
          isAbsent: entry.isAbsent,
          enteredById: auth.userId,
        },
        update: {
          marks: entry.isAbsent ? null : entry.marks,
          grade,
          isAbsent: entry.isAbsent,
          enteredById: auth.userId,
        },
      });
      saved.push(row);
    }
    return saved;
  });
}

export async function listMarks(auth: RequestAuth, query: ListMarksQueryInput) {
  const examSubject = await getExamSubjectOrThrow(auth, query.examSubjectId);
  assertBranchAccess(auth, examSubject.exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.marksEntry.findMany({
      where: {
        examSubjectId: query.examSubjectId,
        ...(query.since ? { updatedAt: { gte: query.since } } : {}),
      },
      orderBy: { createdAt: "asc" },
    })
  );
}

export async function lockMarksEntry(auth: RequestAuth, id: string) {
  const entry = await withTenant(auth.tenantId, (tx) => tx.marksEntry.findUnique({ where: { id } }));
  if (!entry) {
    throw new AppError("NOT_FOUND", "marks.errors.entryNotFound");
  }
  assertBranchAccess(auth, entry.branchId);

  return withTenant(auth.tenantId, (tx) => tx.marksEntry.update({ where: { id }, data: { lockedAt: new Date() } }));
}
