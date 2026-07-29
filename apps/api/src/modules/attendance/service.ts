import { randomBytes } from "node:crypto";
import { getCurrentSessionId, Prisma, withTenant } from "@vidyut/db";
import type {
  AttendanceAnalyticsQueryInput,
  AttendanceDefaultersQueryInput,
  AttendanceRegisterQueryInput,
  DeviceScanInput,
  ListAttendanceQueryInput,
  MarkAttendanceInput,
  RegularizeAttendanceInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";
import { getStaffByUserId } from "../staff/service";

/** Statuses that count as "present" for percent calculations — shared by
 * getDefaulters and getAnalytics so the definition lives in one place. */
const PRESENT_STATUSES = ["PRESENT", "LATE", "HALF_DAY"] as const;

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** A TEACHER may only mark a section they're assigned to; PRINCIPAL/ADMIN aren't section-restricted. */
async function assertCanMarkSection(auth: RequestAuth, sectionId: string): Promise<void> {
  if (!auth.roles.includes("TEACHER") || auth.roles.some((r) => r === "PRINCIPAL" || r === "ADMIN" || r === "OWNER")) {
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

export async function markAttendance(auth: RequestAuth, input: MarkAttendanceInput) {
  assertBranchAccess(auth, input.branchId);
  await assertCanMarkSection(auth, input.sectionId);

  const results = await withTenant(auth.tenantId, async (tx) => {
    const sessionId = await getCurrentSessionId(tx, input.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
    }

    const periodId = input.periodId ?? null;
    const saved = [];
    for (const record of input.records) {
      // periodId is part of a partial-unique index, not a Prisma-recognized
      // compound key (see attendance.prisma) — upsert manually.
      const existing = await tx.attendanceRecord.findFirst({
        where: { studentId: record.studentId, date: input.date, periodId },
      });

      const row = existing
        ? await tx.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              sectionId: input.sectionId,
              status: record.status,
              markedById: auth.userId,
              source: input.source,
            },
          })
        : await tx.attendanceRecord.create({
            data: {
              ...(record.id ? { id: record.id } : {}),
              tenantId: auth.tenantId,
              branchId: input.branchId,
              sessionId,
              sectionId: input.sectionId,
              studentId: record.studentId,
              date: input.date,
              periodId,
              status: record.status,
              markedById: auth.userId,
              source: input.source,
            },
          });
      // Only alert on a genuine transition into ABSENT, not a re-mark that
      // was already ABSENT (avoids duplicate alerts on repeated syncs).
      const isNewAbsence = row.status === "ABSENT" && existing?.status !== "ABSENT";
      saved.push({ row, isNewAbsence });
    }
    return saved;
  });

  // Outside the transaction — an alert should only fire once the mark has
  // genuinely committed (context/feature-specs/16's scope #3).
  for (const { row, isNewAbsence } of results) {
    if (isNewAbsence) {
      await enqueue("students.absenceAlert", {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: row.studentId,
        date: row.date.toISOString(),
      });
    }
  }

  return results.map((r) => r.row);
}

export async function listAttendance(auth: RequestAuth, query: ListAttendanceQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.AttendanceRecordWhereInput = {
      branchId: query.branchId,
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.date ? { date: query.date } : {}),
      ...(query.periodId ? { periodId: query.periodId } : {}),
      ...(query.since ? { updatedAt: { gte: query.since } } : {}),
    };
    const [items, total] = await Promise.all([
      tx.attendanceRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.attendanceRecord.count({ where }),
    ]);
    return { items, total };
  });
}

export async function regularizeAttendance(auth: RequestAuth, id: string, input: RegularizeAttendanceInput) {
  const record = await withTenant(auth.tenantId, (tx) => tx.attendanceRecord.findUnique({ where: { id } }));
  if (!record) {
    throw new AppError("NOT_FOUND", "attendance.errors.notFound");
  }
  assertBranchAccess(auth, record.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const updated = await tx.attendanceRecord.update({
      where: { id },
      data: {
        status: input.status,
        regularizedById: auth.userId,
        regularizeReason: input.reason,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: auth.tenantId,
        branchId: record.branchId,
        actorId: auth.userId,
        action: "attendance.regularize",
        entity: "AttendanceRecord",
        entityId: id,
        before: { status: record.status } as Prisma.InputJsonValue,
        after: { status: input.status, reason: input.reason } as Prisma.InputJsonValue,
      },
    });

    return updated;
  });
}

export async function getRegister(auth: RequestAuth, query: AttendanceRegisterQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: query.sectionId } });
    if (!section) {
      throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
    }
    assertBranchAccess(auth, section.branchId);

    const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1));
    const monthEnd = new Date(Date.UTC(query.year, query.month, 1));

    const [enrollments, records] = await Promise.all([
      tx.enrollment.findMany({ where: { sectionId: query.sectionId }, include: { student: true } }),
      tx.attendanceRecord.findMany({
        where: { sectionId: query.sectionId, date: { gte: monthStart, lt: monthEnd } },
      }),
    ]);

    const byStudent = new Map<string, Record<string, string>>();
    for (const enrollment of enrollments) {
      byStudent.set(enrollment.studentId, {});
    }
    for (const record of records) {
      const day = String(record.date.getUTCDate());
      const days = byStudent.get(record.studentId) ?? {};
      days[day] = record.status;
      byStudent.set(record.studentId, days);
    }

    return enrollments.map((enrollment) => ({
      studentId: enrollment.studentId,
      firstName: enrollment.student.firstName,
      lastName: enrollment.student.lastName,
      days: byStudent.get(enrollment.studentId) ?? {},
    }));
  });
}

export async function getDefaulters(auth: RequestAuth, query: AttendanceDefaultersQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = await getCurrentSessionId(tx, query.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
    }

    const enrollments = await tx.enrollment.findMany({
      where: {
        sessionId,
        section: { branchId: query.branchId },
        ...(query.classId ? { classId: query.classId } : {}),
      },
      include: { student: true },
    });

    const results = [];
    for (const enrollment of enrollments) {
      const [total, present] = await Promise.all([
        tx.attendanceRecord.count({ where: { studentId: enrollment.studentId, sessionId } }),
        tx.attendanceRecord.count({
          where: { studentId: enrollment.studentId, sessionId, status: { in: [...PRESENT_STATUSES] } },
        }),
      ]);
      if (total === 0) continue;
      const percent = (present / total) * 100;
      if (percent < query.thresholdPercent) {
        results.push({
          studentId: enrollment.studentId,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          attendancePercent: Math.round(percent * 100) / 100,
        });
      }
    }
    return results;
  });
}

// -- Unit 44: device-scan ingestion --------------------------------------------

/** Rotates (or generates, first time) a branch's device-scan token. Returns
 * the raw token — the only time it's shown, matching the API-key convention.
 * The tenantId is embedded as a plaintext prefix so `deviceScan` can resolve
 * which tenant's RLS context to open *before* it has looked anything up —
 * Branch is RLS-scoped, so a lookup with no tenant context set would just
 * return zero rows, not "not found". The random suffix is the actual secret. */
export async function rotateAttendanceDeviceToken(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  const token = `${auth.tenantId}.${randomBytes(24).toString("hex")}`;
  await withTenant(auth.tenantId, (tx) =>
    tx.branch.update({ where: { id: branchId }, data: { attendanceDeviceToken: token } })
  );
  return { deviceToken: token };
}

/** No user JWT here — the device authenticates via its per-branch token
 * (context/feature-specs/44's Open Question 1). Not tenant/branch-scoped by
 * auth middleware, so we resolve tenant/branch from the token itself. */
export async function deviceScan(input: DeviceScanInput) {
  const tenantId = input.deviceToken.split(".")[0];
  if (!tenantId) {
    throw new AppError("UNAUTHENTICATED", "attendance.errors.invalidDeviceToken");
  }

  const branch = await withTenant(tenantId, (tx) =>
    tx.branch.findFirst({ where: { attendanceDeviceToken: input.deviceToken } })
  );
  if (!branch) {
    throw new AppError("UNAUTHENTICATED", "attendance.errors.invalidDeviceToken");
  }

  const date = input.timestamp ?? new Date();
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  return withTenant(branch.tenantId, async (tx) => {
    const sessionId = await getCurrentSessionId(tx, branch.id);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
    }

    const student = await tx.student.findFirst({
      where: { branchId: branch.id, admissionNo: input.admissionNo },
    });
    if (!student) {
      throw new AppError("NOT_FOUND", "student.errors.notFound");
    }
    const enrollment = await tx.enrollment.findFirst({
      where: { studentId: student.id, sessionId },
    });
    if (!enrollment) {
      throw new AppError("VALIDATION_ERROR", "student.errors.notEnrolled");
    }

    const existing = await tx.attendanceRecord.findFirst({
      where: { studentId: student.id, date: day, periodId: null },
    });

    return existing
      ? tx.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: input.status, source: "BIOMETRIC" },
        })
      : tx.attendanceRecord.create({
          data: {
            tenantId: branch.tenantId,
            branchId: branch.id,
            sessionId,
            sectionId: enrollment.sectionId,
            studentId: student.id,
            date: day,
            status: input.status,
            source: "BIOMETRIC",
          },
        });
  });
}

// -- Unit 44: attendance analytics --------------------------------------------

export async function getAnalytics(auth: RequestAuth, query: AttendanceAnalyticsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const sessionId = await getCurrentSessionId(tx, query.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "student.errors.noCurrentSession");
    }

    const enrollments = await tx.enrollment.findMany({
      where: { sessionId, section: { branchId: query.branchId }, ...(query.classId ? { classId: query.classId } : {}) },
      include: { student: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);

    const records = await tx.attendanceRecord.findMany({
      where: {
        sessionId,
        branchId: query.branchId,
        periodId: null,
        studentId: { in: studentIds },
        date: { gte: query.from, lte: query.to },
      },
    });

    const byDate = new Map<string, { present: number; total: number }>();
    const absenceCounts = new Map<string, number>();
    for (const record of records) {
      const key = record.date.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if ((PRESENT_STATUSES as readonly string[]).includes(record.status)) {
        bucket.present += 1;
      }
      byDate.set(key, bucket);
      if (record.status === "ABSENT") {
        absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) ?? 0) + 1);
      }
    }

    const trend = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        attendancePercent: Math.round((bucket.present / bucket.total) * 10000) / 100,
      }));

    const chronicAbsentees = enrollments
      .filter((e) => (absenceCounts.get(e.studentId) ?? 0) >= query.minAbsences)
      .map((e) => ({
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        absences: absenceCounts.get(e.studentId) ?? 0,
      }));

    return { trend, chronicAbsentees };
  });
}
