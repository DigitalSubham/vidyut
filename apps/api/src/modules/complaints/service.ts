import { withTenant } from "@vidyut/db";
import type { CreateComplaintInput, ListComplaintsQueryInput, ResolveComplaintInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { resolveSelfStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** Staff use branch membership; self-scoped roles (no BranchMembership) prove it via one of their own linked students actually belonging to that branch. */
async function assertCanRaiseInBranch(auth: RequestAuth, branchId: string): Promise<void> {
  if (branchAccessAllowed(auth, branchId)) {
    return;
  }
  const studentIds = await resolveSelfStudentIds(auth);
  if (studentIds.length === 0) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
  const owns = await withTenant(auth.tenantId, (tx) =>
    tx.student.findFirst({ where: { id: { in: studentIds }, branchId } })
  );
  if (!owns) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createComplaint(auth: RequestAuth, input: CreateComplaintInput) {
  await assertCanRaiseInBranch(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.complaint.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        raisedByUserId: auth.userId,
        category: input.category,
        body: input.body,
      },
    })
  );
}

export async function listComplaints(auth: RequestAuth, query: ListComplaintsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.complaint.findMany({
      where: { branchId: query.branchId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function resolveComplaint(auth: RequestAuth, id: string, input: ResolveComplaintInput) {
  const complaint = await withTenant(auth.tenantId, (tx) => tx.complaint.findUnique({ where: { id } }));
  if (!complaint) {
    throw new AppError("NOT_FOUND", "engagement.errors.complaintNotFound");
  }
  assertBranchAccess(auth, complaint.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.complaint.update({
      where: { id },
      data: { status: "RESOLVED", resolution: input.resolution, resolvedById: auth.userId, resolvedAt: new Date() },
    })
  );
}

/** The caller's own raised complaints, any role — no branch/self-scope gate needed beyond "these rows belong to auth.userId". */
export async function getMyComplaints(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.complaint.findMany({ where: { raisedByUserId: auth.userId }, orderBy: { createdAt: "desc" } })
  );
}
