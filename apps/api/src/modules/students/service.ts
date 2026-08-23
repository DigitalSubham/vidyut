import { randomUUID } from "node:crypto";
import { getCurrentSessionId, nextAdmissionNo, Prisma, withTenant } from "@vidyut/db";
import type {
  CreateStudentInput,
  CreateTimelineEntryInput,
  ImportStudentsInput,
  LinkSiblingsInput,
  ListAlumniQueryInput,
  ListStudentsQueryInput,
  PatchStudentInput,
  ReadmitStudentInput,
  RequestImportUploadInput,
  TransferStudentInput,
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

/**
 * Unit 66 scope #2 — Open Question 2's resolution: history stays put, old
 * attendance/marks/fee records already carry their own branchId at creation
 * time and are never rewritten. Because `Enrollment` has
 * `@@unique([studentId, sessionId])`, a same-session branch move can't
 * "close and reopen" a second row for that session — it updates the current
 * Enrollment in place (branch/class/section) and moves `Student.branchId`
 * forward, exactly mirroring how a promotion updates one row, not two.
 */
export async function transferStudent(auth: RequestAuth, id: string, input: TransferStudentInput) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  assertBranchAccess(auth, input.targetBranchId);

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = await requireCurrentSessionId(tx, input.targetBranchId);

    const currentEnrollment = await tx.enrollment.findUnique({
      where: { studentId_sessionId: { studentId: id, sessionId } },
    });
    if (!currentEnrollment) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentEnrollment");
    }

    await tx.enrollment.update({
      where: { id: currentEnrollment.id },
      data: { branchId: input.targetBranchId, classId: input.targetClassId, sectionId: input.targetSectionId },
    });

    return tx.student.update({ where: { id }, data: { branchId: input.targetBranchId } });
  });
}

/** Unit 66 scope #3 — a status transition, not a separate alumni-portal login (Out of scope). */
export async function markAlumni(auth: RequestAuth, id: string) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  return withTenant(auth.tenantId, (tx) => tx.student.update({ where: { id }, data: { status: "ALUMNI" } }));
}

export async function listAlumni(auth: RequestAuth, query: ListAlumniQueryInput) {
  assertBranchAccess(auth, query.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const where = { branchId: query.branchId, status: "ALUMNI" as const, deletedAt: null };
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

/**
 * Unit 66 scope #4 — distinct from Unit 33's rollover-time REPEAT (Open
 * Question 3). If the student already has a (now-`LEFT`) Enrollment for the
 * current session (withdrawn mid-year), this reactivates that same row —
 * the `@@unique([studentId, sessionId])` constraint rules out a second row.
 * Otherwise (withdrawn in an earlier session) it creates a fresh one.
 */
export async function readmitStudent(auth: RequestAuth, id: string, input: ReadmitStudentInput) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  if (student.status === "ACTIVE") {
    throw new AppError("VALIDATION_ERROR", "student.errors.alreadyActive");
  }

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = await requireCurrentSessionId(tx, student.branchId);

    await tx.enrollment.upsert({
      where: { studentId_sessionId: { studentId: id, sessionId } },
      update: { classId: input.classId, sectionId: input.sectionId, status: "ACTIVE" },
      create: {
        tenantId: auth.tenantId,
        branchId: student.branchId,
        studentId: id,
        sessionId,
        classId: input.classId,
        sectionId: input.sectionId,
      },
    });

    return tx.student.update({ where: { id }, data: { status: "ACTIVE" } });
  });
}

/** Unit 66 scope #1 — a plain tag (Open Question 1); reuses an existing group if one of the given students already has one, else creates a new one. */
export async function linkSiblings(auth: RequestAuth, input: LinkSiblingsInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const students = await tx.student.findMany({ where: { id: { in: input.studentIds } } });
    if (students.length !== input.studentIds.length) {
      throw new AppError("NOT_FOUND", "student.errors.notFound");
    }
    for (const s of students) assertBranchAccess(auth, s.branchId);

    const existingGroupId = students.find((s) => s.siblingGroupId)?.siblingGroupId;
    const group = existingGroupId
      ? { id: existingGroupId }
      : await tx.siblingGroup.create({ data: { tenantId: auth.tenantId } });

    await tx.student.updateMany({
      where: { id: { in: input.studentIds } },
      data: { siblingGroupId: group.id },
    });

    return tx.student.findMany({ where: { siblingGroupId: group.id } });
  });
}

export async function listSiblings(auth: RequestAuth, id: string) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  if (!student.siblingGroupId) return [];
  return withTenant(auth.tenantId, (tx) =>
    tx.student.findMany({ where: { siblingGroupId: student.siblingGroupId!, id: { not: id } } })
  );
}

/** Unit 66 scope #5 — a simple append-only log, surfaced on the student profile. */
export async function createTimelineEntry(auth: RequestAuth, id: string, input: CreateTimelineEntryInput) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.studentTimelineEntry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: student.branchId,
        studentId: id,
        type: input.type,
        body: input.body,
        recordedById: auth.userId,
        occurredAt: input.occurredAt,
      },
    })
  );
}

export async function listTimelineEntries(auth: RequestAuth, id: string) {
  const student = await getStudentOrThrow(auth, id);
  assertBranchAccess(auth, student.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.studentTimelineEntry.findMany({ where: { studentId: id }, orderBy: { occurredAt: "desc" } })
  );
}
