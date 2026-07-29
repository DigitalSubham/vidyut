import { withTenant } from "@vidyut/db";
import type { CreateRoleInput, PatchRolePermissionsInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import type { RequestAuth } from "../../core/guards/types";

/**
 * Unit 36 — closes the `role.manage` RBAC gap. `Role.isSystem` rows (the 7
 * seeded system roles) are immutable here; only a tenant's own custom role
 * can be created/edited. One custom role per tenant today — see the
 * `ponytail:` note on `RoleKey.CUSTOM` (packages/types/src/roles.ts) for the
 * upgrade path if a school ever needs more than one.
 */
export async function createRole(auth: RequestAuth, input: CreateRoleInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.role.findFirst({ where: { tenantId: auth.tenantId, key: "CUSTOM" } });
    if (existing) {
      throw new AppError("CONFLICT", "roles.errors.customRoleAlreadyExists");
    }

    const role = await tx.role.create({
      data: { tenantId: auth.tenantId, key: "CUSTOM", name: input.name, isSystem: false },
    });

    for (const permissionKey of input.permissions) {
      await tx.rolePermission.create({ data: { tenantId: auth.tenantId, roleId: role.id, permissionKey } });
    }

    return tx.role.findUniqueOrThrow({ where: { id: role.id }, include: { rolePermissions: true } });
  });
}

export async function listRoles(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.role.findMany({
      where: { deletedAt: null },
      include: { rolePermissions: true },
      orderBy: { createdAt: "asc" },
    })
  );
}

async function getRoleOrThrow(auth: RequestAuth, id: string) {
  const role = await withTenant(auth.tenantId, (tx) => tx.role.findUnique({ where: { id } }));
  if (!role || role.deletedAt) {
    throw new AppError("NOT_FOUND", "roles.errors.notFound");
  }
  return role;
}

export async function patchRolePermissions(auth: RequestAuth, id: string, input: PatchRolePermissionsInput) {
  const role = await getRoleOrThrow(auth, id);
  if (role.isSystem) {
    throw new AppError("FORBIDDEN", "roles.errors.systemRoleImmutable");
  }

  return withTenant(auth.tenantId, async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    for (const permissionKey of input.permissions) {
      await tx.rolePermission.create({ data: { tenantId: auth.tenantId, roleId: id, permissionKey } });
    }
    return tx.role.findUniqueOrThrow({ where: { id }, include: { rolePermissions: true } });
  });
}
