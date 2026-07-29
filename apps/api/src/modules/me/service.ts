import { getCurrentSessionId, withTenant, type Prisma } from "@vidyut/db";
import type {
  CreateDataDeletionRequestInput,
  ListMyNotificationsQueryInput,
  MyAttendanceQueryInput,
  MyHomeworkCalendarQueryInput,
  MyStudentScopedQueryInput,
  RegisterPushTokenInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { resolveSelfStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";
import { buildStudentFeeLedgerEntries } from "../payments/service";

// --- Unit 34: DPDP data export ---

/**
 * Self-scoped export of the caller's own data (DPDP compliance, Unit 34's
 * Open Question 3) — reuses `resolveSelfStudentIds` so a PARENT gets their
 * linked children's records and a STUDENT gets their own, never anyone
 * else's. Deliberately limited to personal data a user would recognize as
 * "theirs" (own profile, own/children's academic + attendance + fee-paid
 * history) — not staff-internal operational data.
 */
export async function getMyDataExport(auth: RequestAuth) {
  const studentIds = await resolveSelfStudentIds(auth);

  return withTenant(auth.tenantId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, phone: true, email: true, locale: true, createdAt: true },
    });

    if (studentIds.length === 0) {
      return { user, students: [] };
    }

    const students = await Promise.all(
      studentIds.map(async (studentId) => {
        const [student, attendanceRecords, invoices, payments] = await Promise.all([
          tx.student.findUnique({ where: { id: studentId } }),
          tx.attendanceRecord.findMany({ where: { studentId } }),
          tx.invoice.findMany({ where: { studentId } }),
          tx.payment.findMany({ where: { studentId } }),
        ]);
        return { student, attendanceRecords, invoices, payments };
      })
    );

    return { user, students };
  });
}

/**
 * Every function here re-checks `studentId` against the caller's own
 * resolved self-scope on every call (context/feature-specs/24's Open
 * Question 2) — never trust a client-supplied studentId alone.
 */
async function assertOwnStudent(auth: RequestAuth, studentId: string): Promise<void> {
  const ownIds = await resolveSelfStudentIds(auth);
  if (!ownIds.includes(studentId)) {
    throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
  }
}

/** The caller's own resolved student(s) — themselves (STUDENT) or their linked children (PARENT). */
export async function getMyStudents(auth: RequestAuth) {
  const studentIds = await resolveSelfStudentIds(auth);
  if (studentIds.length === 0) {
    return [];
  }
  return withTenant(auth.tenantId, (tx) =>
    tx.student.findMany({ where: { id: { in: studentIds }, deletedAt: null } })
  );
}

export async function getMyAttendance(auth: RequestAuth, query: MyAttendanceQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1));
  const monthEnd = new Date(Date.UTC(query.year, query.month, 1));

  return withTenant(auth.tenantId, (tx) =>
    tx.attendanceRecord.findMany({
      where: { studentId: query.studentId, date: { gte: monthStart, lt: monthEnd } },
      orderBy: { date: "asc" },
    })
  );
}

export async function getMyReportCards(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCard.findMany({
      where: { studentId: query.studentId, publishedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    })
  );
}

/** Resolves the student's current-session section, shared by homework + timetable below. */
async function resolveCurrentSectionId(tx: Prisma.TransactionClient, studentId: string): Promise<string | null> {
  const student = await tx.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return null;
  }
  const sessionId = await getCurrentSessionId(tx, student.branchId);
  if (!sessionId) {
    return null;
  }
  const enrollment = await tx.enrollment.findFirst({ where: { studentId, sessionId } });
  return enrollment?.sectionId ?? null;
}

export async function getMyHomework(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const sectionId = await resolveCurrentSectionId(tx, query.studentId);
    if (!sectionId) {
      return [];
    }
    return tx.homework.findMany({ where: { sectionId }, orderBy: { dueDate: "asc" } });
  });
}

/** Unit 45 — same data as getMyHomework, grouped by due-date day within one
 * calendar month (spec's own scope #2: "same data ... grouped by due date"). */
export async function getMyHomeworkCalendar(auth: RequestAuth, query: MyHomeworkCalendarQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const sectionId = await resolveCurrentSectionId(tx, query.studentId);
    if (!sectionId) {
      return {};
    }
    const monthStart = new Date(Date.UTC(query.year, query.month - 1, 1));
    const monthEnd = new Date(Date.UTC(query.year, query.month, 1));
    const homework = await tx.homework.findMany({
      where: { sectionId, dueDate: { gte: monthStart, lt: monthEnd } },
      orderBy: { dueDate: "asc" },
    });

    const byDay: Record<string, typeof homework> = {};
    for (const item of homework) {
      const day = String(item.dueDate.getUTCDate());
      byDay[day] = [...(byDay[day] ?? []), item];
    }
    return byDay;
  });
}

export async function getMyTimetable(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const sectionId = await resolveCurrentSectionId(tx, query.studentId);
    if (!sectionId) {
      return [];
    }
    return tx.timetablePeriod.findMany({
      where: { sectionId },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });
  });
}

/** Self-scoped fee ledger (Unit 25) — same computation as the staff-facing read (Unit 12), just authorized by self-scope instead of branch/permission. */
export async function getMyFeeLedger(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, (tx) => buildStudentFeeLedgerEntries(tx, query.studentId));
}

interface AnnouncementAudience {
  roles?: string[];
  classIds?: string[];
}

/**
 * Self-scoped notices feed (Unit 25) — same audience-matching rule as the
 * worker's announcement.fanout job (Unit 20), just a read here instead of a
 * NotificationLog write. Empty/missing audience = visible to everyone.
 */
export async function getMyAnnouncements(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const student = await tx.student.findUnique({ where: { id: query.studentId } });
    if (!student) {
      return [];
    }
    const sessionId = await getCurrentSessionId(tx, student.branchId);
    const enrollment = sessionId
      ? await tx.enrollment.findFirst({ where: { studentId: query.studentId, sessionId } })
      : null;

    const announcements = await tx.announcement.findMany({
      where: { branchId: student.branchId },
      orderBy: { publishedAt: "desc" },
    });

    return announcements.filter((a) => {
      const audience = (a.audience as AnnouncementAudience | null) ?? {};
      if (!audience.roles?.length && !audience.classIds?.length) {
        return true;
      }
      if (audience.roles?.some((r) => auth.roles.includes(r as never))) {
        return true;
      }
      if (enrollment && audience.classIds?.includes(enrollment.classId)) {
        return true;
      }
      return false;
    });
  });
}

// --- Unit 39: DPDP delete-on-request ---

/**
 * Self-scoped delete request (DPDP compliance, Open Question 3) — creates a
 * `DataDeletionRequest` for OWNER review; never deletes anything itself.
 * Deleting attendance/marks/fee history has real business-record
 * implications the school, not the parent, must ultimately authorize.
 */
export async function createDataDeletionRequest(auth: RequestAuth, input: CreateDataDeletionRequestInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.dataDeletionRequest.create({
      data: { tenantId: auth.tenantId, requestedById: auth.userId, reason: input.reason },
    })
  );
}

// --- Unit 40: In-app inbox + push token registration ---

/** Self-scoped by `toUserId = auth.userId` — never another user's notifications. */
export async function getMyNotifications(auth: RequestAuth, query: ListMyNotificationsQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const where = { toUserId: auth.userId };
    const [items, total] = await Promise.all([
      tx.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.notificationLog.count({ where }),
    ]);
    return { items, total };
  });
}

export async function markNotificationRead(auth: RequestAuth, id: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const notification = await tx.notificationLog.findUnique({ where: { id } });
    if (!notification || notification.toUserId !== auth.userId) {
      throw new AppError("NOT_FOUND", "notification.errors.notFound");
    }
    return tx.notificationLog.update({ where: { id }, data: { readAt: notification.readAt ?? new Date() } });
  });
}

export async function registerPushToken(auth: RequestAuth, input: RegisterPushTokenInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.user.update({ where: { id: auth.userId }, data: { pushToken: input.pushToken } })
  );
}
