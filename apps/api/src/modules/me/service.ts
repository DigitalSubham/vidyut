import { getCurrentSessionId, withTenant, type Prisma } from "@vidyut/db";
import type {
  CreateDataDeletionRequestInput,
  ListMyNotificationsQueryInput,
  MyAttendanceQueryInput,
  MyCalendarQueryInput,
  MyHomeworkCalendarQueryInput,
  MyStudentScopedQueryInput,
  RegisterPushTokenInput,
  SetCommunicationPreferenceInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { resolveSelfStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";
import { buildStudentFeeLedgerEntries } from "../payments/service";
import { getMergedCalendar } from "../calendar/service";

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

/** Unit 52 — the student's current-session subject teachers, feeding the parent PTM-booking screen (needs a staffId to browse slots for). */
export async function getMyTeachers(auth: RequestAuth, query: MyStudentScopedQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  return withTenant(auth.tenantId, async (tx) => {
    const sectionId = await resolveCurrentSectionId(tx, query.studentId);
    if (!sectionId) {
      return [];
    }
    const assignments = await tx.teacherAssignment.findMany({
      where: { sectionId },
      include: { staff: { include: { user: true } }, subject: true },
    });
    return assignments.map((a) => ({
      staffId: a.staffId,
      staffName: a.staff.user.name,
      subjectName: a.subject.name,
    }));
  });
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

// --- Unit 49: Messaging & Engagement (self-scoped reads) ---

/** The caller's own Guardian id, if they are one — used mobile-side to identify themselves as a conversation participant (Message.guardianId), since a PARENT token carries no guardianId claim of its own. */
export async function getMyGuardian(auth: RequestAuth) {
  const guardian = await withTenant(auth.tenantId, (tx) => tx.guardian.findFirst({ where: { userId: auth.userId } }));
  if (!guardian) {
    throw new AppError("NOT_FOUND", "engagement.errors.notGuardian");
  }
  return { id: guardian.id };
}

interface CircularAudience {
  classIds?: string[];
}

/** Same audience-matching pattern as getMyAnnouncements above, plus whether the caller has already acked each circular. */
export async function getMyCirculars(auth: RequestAuth, query: MyStudentScopedQueryInput) {
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

    const circulars = await tx.circular.findMany({
      where: { branchId: student.branchId },
      orderBy: { publishedAt: "desc" },
    });
    const visible = circulars.filter((c) => {
      const audience = (c.audience as CircularAudience | null) ?? {};
      if (!audience.classIds?.length) return true;
      return enrollment ? audience.classIds.includes(enrollment.classId) : false;
    });

    const acks = await tx.circularAck.findMany({
      where: { circularId: { in: visible.map((c) => c.id) }, userId: auth.userId },
    });
    const ackedIds = new Set(acks.map((a) => a.circularId));

    return visible.map((c) => ({ ...c, acked: ackedIds.has(c.id) }));
  });
}

/** Delegates the actual merge to calendar/service.ts, after resolving the caller's own class/section (self-scope verified via assertOwnStudent first). */
export async function getMyCalendar(auth: RequestAuth, query: MyCalendarQueryInput) {
  await assertOwnStudent(auth, query.studentId);

  const sectionInfo = await withTenant(auth.tenantId, async (tx) => {
    const student = await tx.student.findUnique({ where: { id: query.studentId } });
    if (!student) return null;
    const sessionId = await getCurrentSessionId(tx, student.branchId);
    if (!sessionId) return null;
    const enrollment = await tx.enrollment.findFirst({ where: { studentId: query.studentId, sessionId } });
    if (!enrollment) return null;
    return { branchId: student.branchId, classId: enrollment.classId, sectionId: enrollment.sectionId };
  });
  if (!sectionInfo) {
    return [];
  }

  return getMergedCalendar(auth, { ...sectionInfo, month: query.month, year: query.year });
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

/**
 * Unit 68 — the caller's per-channel opt-out list. Absence of a row for a
 * channel means "opted in" (the confirmed default, including for birthday
 * automation), so this only returns the rows that exist (i.e. the explicit
 * overrides), not one row per channel.
 */
export async function getMyCommunicationPreferences(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.communicationPreference.findMany({ where: { userId: auth.userId } })
  );
}

/** Unit 69 scope #4 — the tour is entirely frontend-scripted; this is just the "seen it" flag. */
export async function markTourSeen(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.user.update({ where: { id: auth.userId }, data: { hasSeenTour: true } })
  );
}

export async function getTourSeen(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.user.findUnique({ where: { id: auth.userId }, select: { hasSeenTour: true } })
  );
}

export async function setMyCommunicationPreference(auth: RequestAuth, input: SetCommunicationPreferenceInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.communicationPreference.upsert({
      where: { userId_channel: { userId: auth.userId, channel: input.channel } },
      update: { optedIn: input.optedIn },
      create: { tenantId: auth.tenantId, userId: auth.userId, channel: input.channel, optedIn: input.optedIn },
    })
  );
}
