import { withTenant } from "@vidyut/db";
import type { SearchQueryInput } from "@vidyut/validation";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { userHasPermission } from "../../core/guards/require-permission";
import type { RequestAuth } from "../../core/guards/types";
import { AppError } from "../../core/errors";

const RESULT_LIMIT = 5;

/**
 * Unit 37 — one aggregate "jump to record" read across models that already
 * have their own list/filter endpoints (Postgres ILIKE + pg_trgm GIN index,
 * per this unit's own Open Question 1 — no dedicated search engine at this
 * school-count). Each category is gated by the permission its own module
 * already uses, reused rather than a new "search.view" permission: students
 * need `student.view`, invoices need `fee.view`; staff-directory reads are
 * ungated everywhere else in this codebase (see staff/routes.ts), so they
 * stay ungated here too.
 */
export async function search(auth: RequestAuth, query: SearchQueryInput) {
  if (!branchAccessAllowed(auth, query.branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }

  const [canViewStudents, canViewFees] = await Promise.all([
    userHasPermission(auth, "student.view"),
    userHasPermission(auth, "fee.view"),
  ]);

  return withTenant(auth.tenantId, async (tx) => {
    const [students, staff, invoices] = await Promise.all([
      canViewStudents
        ? tx.student.findMany({
            where: {
              branchId: query.branchId,
              deletedAt: null,
              OR: [
                { firstName: { contains: query.q, mode: "insensitive" } },
                { lastName: { contains: query.q, mode: "insensitive" } },
                { admissionNo: { contains: query.q, mode: "insensitive" } },
              ],
            },
            select: { id: true, firstName: true, lastName: true, admissionNo: true },
            take: RESULT_LIMIT,
          })
        : [],
      tx.staff.findMany({
        where: {
          branchId: query.branchId,
          deletedAt: null,
          user: { name: { contains: query.q, mode: "insensitive" } },
        },
        include: { user: { select: { name: true } } },
        take: RESULT_LIMIT,
      }),
      canViewFees
        ? tx.invoice.findMany({
            where: { branchId: query.branchId, number: { contains: query.q, mode: "insensitive" } },
            select: { id: true, number: true, studentId: true },
            take: RESULT_LIMIT,
          })
        : [],
    ]);

    return {
      students: students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo })),
      staff: staff.map((s) => ({ id: s.id, name: s.user.name })),
      invoices: invoices.map((i) => ({ id: i.id, number: i.number, studentId: i.studentId })),
    };
  });
}
