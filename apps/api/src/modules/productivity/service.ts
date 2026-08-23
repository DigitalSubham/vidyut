import { withTenant } from "@vidyut/db";
import type { CreateStaffTaskInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createStaffTask(auth: RequestAuth, input: CreateStaffTaskInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.staffTask.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        assignedToId: input.assignedToId,
        assignedById: auth.userId,
        title: input.title,
        dueDate: input.dueDate,
      },
    })
  );
}

export async function listStaffTasks(auth: RequestAuth, branchId: string, assignedToId?: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.staffTask.findMany({
      where: { branchId, ...(assignedToId ? { assignedToId } : {}) },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function completeStaffTask(auth: RequestAuth, id: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const task = await tx.staffTask.findUnique({ where: { id } });
    if (!task) {
      throw new AppError("NOT_FOUND", "productivity.errors.taskNotFound");
    }
    assertBranchAccess(auth, task.branchId);
    return tx.staffTask.update({ where: { id }, data: { status: "DONE" } });
  });
}
