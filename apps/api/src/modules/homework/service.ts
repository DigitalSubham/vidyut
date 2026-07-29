import { randomUUID } from "node:crypto";
import { withTenant } from "@vidyut/db";
import type {
  CreateHomeworkInput,
  GradeHomeworkSubmissionInput,
  ListHomeworkQueryInput,
  PatchHomeworkInput,
  RequestHomeworkSubmissionUploadInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { resolveSelfStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";
import { getUploadUrl } from "../../core/storage";
import { getStaffByUserId } from "../staff/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** A TEACHER may only post homework for a section they're assigned to teach; PRINCIPAL isn't section-restricted. */
async function assertCanManageSection(auth: RequestAuth, sectionId: string): Promise<void> {
  if (auth.roles.includes("PRINCIPAL")) {
    return;
  }

  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
  }

  const assigned = await withTenant(auth.tenantId, (tx) =>
    tx.teacherAssignment.findFirst({ where: { sectionId, staffId: staff.id } })
  );
  const isClassTeacher = await withTenant(auth.tenantId, (tx) =>
    tx.section.findFirst({ where: { id: sectionId, classTeacherId: staff.id } })
  );
  if (!assigned && !isClassTeacher) {
    throw new AppError("FORBIDDEN", "auth.errors.sectionForbidden");
  }
}

async function getHomeworkOrThrow(auth: RequestAuth, id: string) {
  const homework = await withTenant(auth.tenantId, (tx) => tx.homework.findUnique({ where: { id } }));
  if (!homework) {
    throw new AppError("NOT_FOUND", "homework.errors.notFound");
  }
  return homework;
}

export async function createHomework(auth: RequestAuth, input: CreateHomeworkInput) {
  assertBranchAccess(auth, input.branchId);
  await assertCanManageSection(auth, input.sectionId);

  return withTenant(auth.tenantId, (tx) =>
    tx.homework.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        title: input.title,
        description: input.description,
        attachmentUrl: input.attachmentUrl,
        dueDate: input.dueDate,
        createdById: auth.userId,
      },
    })
  );
}

export async function listHomework(auth: RequestAuth, query: ListHomeworkQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: query.sectionId } });
    if (!section) {
      throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
    }
    assertBranchAccess(auth, section.branchId);

    return tx.homework.findMany({
      where: {
        sectionId: query.sectionId,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.dueBefore || query.dueAfter
          ? {
              dueDate: {
                ...(query.dueBefore ? { lte: query.dueBefore } : {}),
                ...(query.dueAfter ? { gte: query.dueAfter } : {}),
              },
            }
          : {}),
        ...(query.since ? { updatedAt: { gte: query.since } } : {}),
      },
      orderBy: { dueDate: "asc" },
    });
  });
}

export async function patchHomework(auth: RequestAuth, id: string, input: PatchHomeworkInput) {
  const homework = await getHomeworkOrThrow(auth, id);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  return withTenant(auth.tenantId, (tx) => tx.homework.update({ where: { id }, data: input }));
}

export async function deleteHomework(auth: RequestAuth, id: string): Promise<void> {
  const homework = await getHomeworkOrThrow(auth, id);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  await withTenant(auth.tenantId, (tx) => tx.homework.delete({ where: { id } }));
}

// -- Unit 45: submissions + grading --------------------------------------------

/** PARENT/STUDENT only — a caller may only submit against their own child, never
 * a client-supplied studentId alone (same rule every /me/* write follows). */
async function assertOwnStudent(auth: RequestAuth, studentId: string): Promise<void> {
  const ownIds = await resolveSelfStudentIds(auth);
  if (!ownIds.includes(studentId)) {
    throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
  }
}

/** Presigned upload + submission row, same two-step pattern as Unit 42's
 * staff document upload: client gets a signed URL, uploads directly to the
 * bucket, and this call records the key immediately (no blob through the API). */
export async function requestHomeworkSubmissionUpload(
  auth: RequestAuth,
  homeworkId: string,
  input: RequestHomeworkSubmissionUploadInput
) {
  await assertOwnStudent(auth, input.studentId);
  const homework = await getHomeworkOrThrow(auth, homeworkId);

  const key = `homework-submissions/${auth.tenantId}/${homeworkId}/${input.studentId}/${randomUUID()}-${input.fileName}`;
  const uploadUrl = await getUploadUrl(key, input.contentType);

  const submission = await withTenant(auth.tenantId, (tx) =>
    tx.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId, studentId: input.studentId } },
      create: {
        tenantId: auth.tenantId,
        homeworkId,
        studentId: input.studentId,
        fileUrl: key,
      },
      update: { fileUrl: key, submittedAt: new Date(), grade: null, feedback: null, gradedById: null, gradedAt: null },
    })
  );

  return { ...submission, uploadUrl };
}

async function getSubmissionOrThrow(auth: RequestAuth, id: string) {
  const submission = await withTenant(auth.tenantId, (tx) => tx.homeworkSubmission.findUnique({ where: { id } }));
  if (!submission) {
    throw new AppError("NOT_FOUND", "homework.errors.submissionNotFound");
  }
  return submission;
}

export async function gradeHomeworkSubmission(auth: RequestAuth, id: string, input: GradeHomeworkSubmissionInput) {
  const submission = await getSubmissionOrThrow(auth, id);
  const homework = await getHomeworkOrThrow(auth, submission.homeworkId);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  return withTenant(auth.tenantId, (tx) =>
    tx.homeworkSubmission.update({
      where: { id },
      data: { grade: input.grade, feedback: input.feedback, gradedById: auth.userId, gradedAt: new Date() },
    })
  );
}

export async function listHomeworkSubmissions(auth: RequestAuth, homeworkId: string) {
  const homework = await getHomeworkOrThrow(auth, homeworkId);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  return withTenant(auth.tenantId, (tx) =>
    tx.homeworkSubmission.findMany({ where: { homeworkId }, orderBy: { submittedAt: "desc" } })
  );
}
