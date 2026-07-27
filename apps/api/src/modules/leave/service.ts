import { withTenant } from "@vidyut/db";
import type {
  CreateLeaveRequestInput,
  DecideLeaveRequestInput,
  ListLeaveRequestsQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** No applying on a colleague's behalf (context/feature-specs/09's scope §5). */
export async function createLeaveRequest(auth: RequestAuth, input: CreateLeaveRequestInput) {
  const ownStaff = await withTenant(auth.tenantId, (tx) =>
    tx.staff.findUnique({ where: { userId: auth.userId } })
  );
  if (!ownStaff || ownStaff.id !== input.staffId) {
    throw new AppError("FORBIDDEN", "leave.errors.notOwnStaffRecord");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.leaveRequest.create({
      data: {
        tenantId: auth.tenantId,
        branchId: ownStaff.branchId,
        staffId: ownStaff.id,
        type: input.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        halfDay: input.halfDay,
      },
    })
  );
}

export async function listLeaveRequests(auth: RequestAuth, query: ListLeaveRequestsQueryInput) {
  if (query.branchId) {
    assertBranchAccess(auth, query.branchId);
  }

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.leaveRequest.count({ where }),
    ]);
    return { items, total };
  });
}

async function getLeaveRequestOrThrow(auth: RequestAuth, id: string) {
  const leaveRequest = await withTenant(auth.tenantId, (tx) => tx.leaveRequest.findUnique({ where: { id } }));
  if (!leaveRequest) {
    throw new AppError("NOT_FOUND", "leave.errors.notFound");
  }
  return leaveRequest;
}

/** Approver must share a branch with the requester (context/feature-specs/09's scope §6). */
export async function decideLeaveRequest(auth: RequestAuth, id: string, input: DecideLeaveRequestInput) {
  const leaveRequest = await getLeaveRequestOrThrow(auth, id);
  assertBranchAccess(auth, leaveRequest.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.leaveRequest.update({
      where: { id },
      data: { status: input.status, approverId: auth.userId },
    })
  );
}
