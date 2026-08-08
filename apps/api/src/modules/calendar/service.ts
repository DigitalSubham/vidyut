import { withTenant } from "@vidyut/db";
import type { CreateCalendarEventInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createCalendarEvent(auth: RequestAuth, input: CreateCalendarEventInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.calendarEvent.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        date: input.date,
        type: input.type,
        description: input.description,
        createdById: auth.userId,
      },
    })
  );
}

export async function listCalendarEventsForBranch(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);

  return withTenant(auth.tenantId, (tx) => tx.calendarEvent.findMany({ where: { branchId }, orderBy: { date: "asc" } }));
}

/**
 * Self-scoped unified calendar (Open Question 2's own recommendation): a
 * `CalendarEvent` row is one source, but exam dates and homework due-dates
 * already exist elsewhere and are merged at read time rather than
 * duplicated into this table. Called from the `me` module with a resolved
 * studentId/branchId/classId/sectionId — this function trusts those inputs
 * because the caller (me/service.ts) has already verified self-ownership.
 */
export async function getMergedCalendar(
  auth: RequestAuth,
  params: { branchId: string; classId: string; sectionId: string; month: number; year: number }
) {
  const monthStart = new Date(Date.UTC(params.year, params.month - 1, 1));
  const monthEnd = new Date(Date.UTC(params.year, params.month, 1));

  return withTenant(auth.tenantId, async (tx) => {
    const [events, examSubjects, homework] = await Promise.all([
      tx.calendarEvent.findMany({
        where: { branchId: params.branchId, date: { gte: monthStart, lt: monthEnd } },
      }),
      tx.examSubject.findMany({ where: { classId: params.classId }, select: { examId: true } }),
      tx.homework.findMany({
        where: { sectionId: params.sectionId, dueDate: { gte: monthStart, lt: monthEnd } },
      }),
    ]);

    const examIds = [...new Set(examSubjects.map((es) => es.examId))];
    const examTimetables = examIds.length
      ? await tx.examTimetable.findMany({
          where: { examId: { in: examIds }, date: { gte: monthStart, lt: monthEnd } },
          include: { exam: true, subject: true },
        })
      : [];

    return [
      ...events.map((e) => ({ date: e.date, type: "event" as const, title: e.title, id: e.id })),
      ...examTimetables.map((et) => ({
        date: et.date,
        type: "exam" as const,
        title: `${et.exam.name} — ${et.subject.name}`,
        id: et.id,
      })),
      ...homework.map((h) => ({ date: h.dueDate, type: "homework" as const, title: h.title, id: h.id })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  });
}
