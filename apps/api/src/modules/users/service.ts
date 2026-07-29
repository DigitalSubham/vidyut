import { randomBytes } from "node:crypto";
import { withTenant } from "@vidyut/db";
import type { InviteUserInput, ListUsersQueryInput, PatchUserInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { hashPassword } from "../../core/auth/password";
import { enqueue } from "../../core/jobs";

const isDev = process.env.NODE_ENV !== "production";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/**
 * Unit 36 — closes the `user.manage` RBAC gap: a central "invite a staff
 * user, assign a role/branch" flow, distinct from Unit 09's `createStaff`
 * (which also builds a full Staff HR profile). This is the thinner login-
 * only path for a user who doesn't need an HR record (e.g. a second ADMIN
 * login for an existing staff member, or an owner-designated user).
 */
export async function inviteUser(auth: RequestAuth, input: InviteUserInput) {
  assertBranchAccess(auth, input.branchId);

  const tempPassword = randomBytes(9).toString("base64url");

  const user = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.user.findUnique({
      where: { tenantId_email: { tenantId: auth.tenantId, email: input.email } },
    });
    if (existing) {
      throw new AppError("CONFLICT", "users.errors.emailTaken");
    }

    const role = await tx.role.findFirst({ where: { tenantId: auth.tenantId, key: input.role } });
    if (!role) {
      throw new AppError("VALIDATION_ERROR", "users.errors.roleNotFound");
    }

    const passwordHash = await hashPassword(tempPassword);
    const created = await tx.user.create({
      data: {
        tenantId: auth.tenantId,
        name: input.name,
        email: input.email,
        passwordHash,
        status: "INVITED",
      },
    });

    await tx.userRole.create({
      data: { tenantId: auth.tenantId, userId: created.id, roleId: role.id, branchId: input.branchId },
    });
    await tx.branchMembership.create({
      data: { tenantId: auth.tenantId, userId: created.id, branchId: input.branchId },
    });

    return created;
  });

  // The "send" step runs as a background job (AGENTS.md invariant #2) —
  // same honest-stub posture as Unit 08's guardian invite.
  await enqueue("staff.invite", { email: input.email, tempPassword });

  return { userId: user.id, email: user.email, ...(isDev ? { devTempPassword: tempPassword } : {}) };
}

export async function listUsers(auth: RequestAuth, query: ListUsersQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      deletedAt: null,
      branchMemberships: { some: { branchId: query.branchId } },
    } as const;
    const [items, total] = await Promise.all([
      tx.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.user.count({ where }),
    ]);
    return { items, total };
  });
}

async function getUserOrThrow(auth: RequestAuth, id: string) {
  const user = await withTenant(auth.tenantId, (tx) =>
    tx.user.findUnique({ where: { id }, include: { branchMemberships: true, userRoles: true } })
  );
  if (!user || user.deletedAt) {
    throw new AppError("NOT_FOUND", "users.errors.notFound");
  }
  return user;
}

/** Deactivate/reactivate a user, or reassign their role/branch — gated `user.manage`. */
export async function patchUser(auth: RequestAuth, id: string, input: PatchUserInput) {
  const user = await getUserOrThrow(auth, id);
  const currentBranchId = user.branchMemberships[0]?.branchId;
  if (currentBranchId) {
    assertBranchAccess(auth, currentBranchId);
  }
  if (input.branchId) {
    assertBranchAccess(auth, input.branchId);
  }

  return withTenant(auth.tenantId, async (tx) => {
    if (input.status) {
      await tx.user.update({ where: { id }, data: { status: input.status } });
    }

    if (input.roleKey) {
      const role = await tx.role.findFirst({ where: { tenantId: auth.tenantId, key: input.roleKey } });
      if (!role) {
        throw new AppError("VALIDATION_ERROR", "users.errors.roleNotFound");
      }
      const targetBranchId = input.branchId ?? currentBranchId ?? null;
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({
        data: { tenantId: auth.tenantId, userId: id, roleId: role.id, branchId: targetBranchId },
      });
    }

    if (input.branchId && input.branchId !== currentBranchId) {
      await tx.branchMembership.deleteMany({ where: { userId: id } });
      await tx.branchMembership.create({
        data: { tenantId: auth.tenantId, userId: id, branchId: input.branchId },
      });
    }

    return tx.user.findUniqueOrThrow({ where: { id } });
  });
}
