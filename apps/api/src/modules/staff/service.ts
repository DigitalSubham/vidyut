import { Prisma, withTenant } from "@vidyut/db";
import type { CreateStaffInput, ListStaffQueryInput, PatchStaffInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { hashPassword } from "../../core/auth/password";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** Creates the User+Staff+UserRole+BranchMembership atomically — same pattern as Unit 05's tenant-owner creation. */
export async function createStaff(auth: RequestAuth, input: CreateStaffInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const existingEmail = await tx.user.findUnique({
      where: { tenantId_email: { tenantId: auth.tenantId, email: input.email } },
    });
    if (existingEmail) {
      throw new AppError("CONFLICT", "staff.errors.emailTaken");
    }

    const role = await tx.role.findFirst({ where: { tenantId: auth.tenantId, key: input.role } });
    if (!role) {
      throw new AppError("VALIDATION_ERROR", "staff.errors.roleNotFound");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await tx.user.create({
      data: {
        tenantId: auth.tenantId,
        name: input.name,
        email: input.email,
        passwordHash,
        status: "ACTIVE",
      },
    });

    await tx.userRole.create({
      data: { tenantId: auth.tenantId, userId: user.id, roleId: role.id, branchId: input.branchId },
    });
    await tx.branchMembership.create({
      data: { tenantId: auth.tenantId, userId: user.id, branchId: input.branchId },
    });

    const staff = await tx.staff.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        userId: user.id,
        employeeNo: input.employeeNo,
        designation: input.designation,
        type: input.type,
        qualifications: input.qualifications,
        joinedAt: input.joinedAt,
        docs: input.docs as Prisma.InputJsonValue | undefined,
      },
    });

    return { ...staff, name: user.name, email: user.email };
  });
}

export async function listStaff(auth: RequestAuth, query: ListStaffQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.StaffWhereInput = {
      branchId: query.branchId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { employeeNo: { contains: query.search, mode: "insensitive" } },
              { user: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      tx.staff.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { employeeNo: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.staff.count({ where }),
    ]);
    return { items, total };
  });
}

async function getStaffOrThrow(auth: RequestAuth, id: string) {
  const staff = await withTenant(auth.tenantId, (tx) =>
    tx.staff.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } })
  );
  if (!staff || staff.deletedAt) {
    throw new AppError("NOT_FOUND", "staff.errors.notFound");
  }
  return staff;
}

export async function getStaff(auth: RequestAuth, id: string) {
  return getStaffOrThrow(auth, id);
}

export async function patchStaff(auth: RequestAuth, id: string, input: PatchStaffInput) {
  const staff = await getStaffOrThrow(auth, id);
  assertBranchAccess(auth, staff.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.staff.update({
      where: { id },
      data: { ...input, docs: input.docs as Prisma.InputJsonValue | undefined },
    })
  );
}

/** Resolves the authenticated user's own Staff row — used by the leave module's ownership check. */
export async function getStaffByUserId(tenantId: string, userId: string) {
  return withTenant(tenantId, (tx) => tx.staff.findUnique({ where: { userId } }));
}
