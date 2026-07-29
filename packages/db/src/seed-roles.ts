import { DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS, type RoleKey, type StaffRoleKey } from "@vidyut/types";
import { withTenant } from "./with-tenant";

// CUSTOM is never auto-seeded — it's created on demand via Unit 36's
// POST /roles, one per tenant, by the tenant itself.
const TENANT_ROLE_KEYS = ROLE_KEYS.filter(
  (key): key is Exclude<RoleKey, "SUPERADMIN" | "CUSTOM"> => key !== "SUPERADMIN" && key !== "CUSTOM"
);

/**
 * Seeds the 7 tenant-assignable system roles + their permission grid
 * (context/rbac.md) for a tenant — used both by the demo-tenant seed script
 * and by real tenant provisioning (Unit 05's platform service), so the two
 * paths can never drift apart. Idempotent (upserts).
 */
export async function seedDefaultRoles(
  tenantId: string
): Promise<Record<Exclude<RoleKey, "SUPERADMIN" | "CUSTOM">, string>> {
  const roleByKey = {} as Record<Exclude<RoleKey, "SUPERADMIN" | "CUSTOM">, string>;

  for (const key of TENANT_ROLE_KEYS) {
    const role = await withTenant(tenantId, (tx) =>
      tx.role.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: {},
        create: { tenantId, key, name: key, isSystem: true },
      })
    );
    roleByKey[key] = role.id;

    const permissions = DEFAULT_ROLE_PERMISSIONS[key as StaffRoleKey];
    if (!permissions) continue; // PARENT/STUDENT bypass the grid (rbac.md rule 5)

    for (const permissionKey of permissions) {
      await withTenant(tenantId, (tx) =>
        tx.rolePermission.upsert({
          where: { roleId_permissionKey: { roleId: role.id, permissionKey } },
          update: {},
          create: { tenantId, roleId: role.id, permissionKey },
        })
      );
    }
  }

  return roleByKey;
}
