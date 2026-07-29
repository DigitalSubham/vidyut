import { randomUUID } from "node:crypto";
import { getCurrentSessionId, nextAdmissionNo, Prisma, withTenant } from "@vidyut/db";
import type {
  CreateStudentInput,
  ImportStudentsInput,
  ListStudentsQueryInput,
  PatchStudentInput,
  RequestImportUploadInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";
import { getUploadUrl } from "../../core/storage";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** Throws if the branch has no current session — no silent fallback (context/feature-specs/07's Decisions). */
async function requireCurrentSessionId(tx: Prisma.TransactionClient, branchId: string): Promise<string> {
  const sessionId = await getCurrentSessionId(tx, branchId);
  if (!sessionId) {
    throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
  }
  return sessionId;
}

export async function createStudent(auth: RequestAuth, input: CreateStudentInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = input.sessionId ?? (await requireCurrentSessionId(tx, input.branchId));
    const admissionNo = input.admissionNo ?? (await nextAdmissionNo(tx, input.branchId));

    const student = await tx.student.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        admissionNo,
        rollNo: input.rollNo,
        firstName: input.firstName,
        lastName: input.lastName,
        dob: input.dob,
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        category: input.category,
        religion: input.religion,
        photoUrl: input.photoUrl,
        address: input.address,
        customFields: input.customFields as Prisma.InputJsonValue | undefined,
      },
    });

    await tx.enrollment.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: student.id,
        sessionId,
        classId: input.classId,
        sectionId: input.sectionId,
        rollNo: input.rollNo,
      },
    });

    return student;
  });
}

export async function listStudents(auth: RequestAuth, query: ListStudentsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.StudentWhereInput = {
      branchId: query.branchId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { admissionNo: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.classId || query.sectionId
        ? {
            enrollments: {
              some: {
                ...(query.classId ? { classId: query.classId } : {}),
                ...(query.sectionId ? { sectionId: query.sectionId } : {}),
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      tx.student.findMany({
        where,
        orderBy: { admissionNo: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.student.count({ where }),
    ]);
    return { items, total };
  });
}

async function getStudentOrThrow(auth: RequestAuth, id: string) {
  const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id } }));
  if (!student || student.deletedAt) {
    throw new AppError("NOT_FOUND", "student.errors.notFound");
  }
  return student;
}

export async function getStudent(auth: RequestAuth, id: string) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  return student;
}

export async function patchStudent(auth: RequestAuth, id: string, input: PatchStudentInput) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.student.update({
      where: { id },
      data: { ...input, customFields: input.customFields as Prisma.InputJsonValue | undefined },
    })
  );
}

export async function deleteStudent(auth: RequestAuth, id: string): Promise<void> {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);

  await withTenant(auth.tenantId, (tx) =>
    tx.student.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

export async function requestImportUpload(auth: RequestAuth, input: RequestImportUploadInput) {
  assertBranchAccess(auth, input.branchId);

  const fileKey = `imports/${auth.tenantId}/${input.branchId}/${randomUUID()}-${input.fileName}`;
  const uploadUrl = await getUploadUrl(fileKey, input.contentType);
  return { fileKey, uploadUrl };
}

export async function importStudents(auth: RequestAuth, input: ImportStudentsInput) {
  assertBranchAccess(auth, input.branchId);

  const jobId = await enqueue("students.import", {
    tenantId: auth.tenantId,
    branchId: input.branchId,
    fileKey: input.fileKey,
  });
  return { jobId };
}

/** Unit 46 — a multi-session ReportCard rollup, not a single-exam view (that's
 * what ReportCard/getMyReportCards already cover). Every published report
 * card the student has, across every session, oldest first. */
export async function getStudentTranscript(auth: RequestAuth, id: string) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCard.findMany({
      where: { studentId: id, publishedAt: { not: null } },
      include: { session: true, exam: true },
      orderBy: [{ session: { startDate: "asc" } }, { exam: { startDate: "asc" } }],
    })
  );
}
