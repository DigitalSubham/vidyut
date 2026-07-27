import { withTenant } from "@vidyut/db";
import type { BulkUpsertTimetableInput, ListTimetableQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function bulkUpsertTimetable(auth: RequestAuth, input: BulkUpsertTimetableInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: input.sectionId } });
    if (!section || section.deletedAt || section.branchId !== input.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.sectionNotFoundInBranch");
    }

    // Cross-section staff double-booking guard (context/feature-specs/22's
    // Open Question 1(b)) — checked across the whole batch before writing
    // any row, so a partially-conflicting batch fails atomically.
    for (const period of input.periods) {
      const conflict = await tx.timetablePeriod.findFirst({
        where: {
          sessionId: input.sessionId,
          staffId: period.staffId,
          dayOfWeek: period.dayOfWeek,
          periodNo: period.periodNo,
          sectionId: { not: input.sectionId },
        },
      });
      if (conflict) {
        throw new AppError("CONFLICT", "timetable.errors.staffDoubleBooked");
      }
    }

    const saved = [];
    for (const period of input.periods) {
      const [subject, staff] = await Promise.all([
        tx.subject.findUnique({ where: { id: period.subjectId } }),
        tx.staff.findUnique({ where: { id: period.staffId } }),
      ]);
      if (!subject || subject.deletedAt || subject.branchId !== input.branchId) {
        throw new AppError("VALIDATION_ERROR", "academic.errors.subjectNotFoundInBranch");
      }
      if (!staff || staff.deletedAt || staff.branchId !== input.branchId) {
        throw new AppError("VALIDATION_ERROR", "staff.errors.staffNotFoundInBranch");
      }

      const row = await tx.timetablePeriod.upsert({
        where: {
          sectionId_dayOfWeek_periodNo: {
            sectionId: input.sectionId,
            dayOfWeek: period.dayOfWeek,
            periodNo: period.periodNo,
          },
        },
        create: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          sessionId: input.sessionId,
          sectionId: input.sectionId,
          dayOfWeek: period.dayOfWeek,
          periodNo: period.periodNo,
          subjectId: period.subjectId,
          staffId: period.staffId,
          room: period.room,
        },
        update: {
          subjectId: period.subjectId,
          staffId: period.staffId,
          room: period.room,
        },
      });
      saved.push(row);
    }
    return saved;
  });
}

export async function listTimetable(auth: RequestAuth, query: ListTimetableQueryInput) {
  if (!query.sectionId && !query.staffId) {
    throw new AppError("VALIDATION_ERROR", "timetable.errors.sectionOrStaffRequired");
  }

  return withTenant(auth.tenantId, async (tx) => {
    if (query.sectionId) {
      const section = await tx.section.findUnique({ where: { id: query.sectionId } });
      if (!section) {
        throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
      }
      assertBranchAccess(auth, section.branchId);
    }
    if (query.staffId) {
      const staff = await tx.staff.findUnique({ where: { id: query.staffId } });
      if (!staff) {
        throw new AppError("NOT_FOUND", "staff.errors.notFound");
      }
      assertBranchAccess(auth, staff.branchId);
    }

    return tx.timetablePeriod.findMany({
      where: {
        ...(query.sectionId ? { sectionId: query.sectionId } : {}),
        ...(query.staffId ? { staffId: query.staffId } : {}),
      },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });
  });
}

export async function deleteTimetablePeriod(auth: RequestAuth, id: string): Promise<void> {
  const period = await withTenant(auth.tenantId, (tx) => tx.timetablePeriod.findUnique({ where: { id } }));
  if (!period) {
    throw new AppError("NOT_FOUND", "timetable.errors.periodNotFound");
  }
  assertBranchAccess(auth, period.branchId);

  await withTenant(auth.tenantId, (tx) => tx.timetablePeriod.delete({ where: { id } }));
}
