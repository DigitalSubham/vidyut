import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/client";
import { withTenant } from "../src/with-tenant";

const createdTenantIds: string[] = [];

async function createTenant(name: string) {
  const tenant = await prisma.tenant.create({
    data: { name, slug: `${name.toLowerCase()}-${randomUUID()}` },
  });
  createdTenantIds.push(tenant.id);
  return tenant;
}

afterAll(async () => {
  // Tenant itself carries no RLS, but its children do — tear those down
  // through withTenant first so the FK-constrained deletes are permitted.
  for (const tenantId of createdTenantIds) {
    await withTenant(tenantId, async (tx) => {
      await tx.userRole.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.academicSession.deleteMany({ where: { tenantId } });
      await tx.branch.deleteMany({ where: { tenantId } });
    });
  }
  await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
  await prisma.$disconnect();
});

describe("tenant isolation", () => {
  it("withTenant() scopes queries to only the given tenant's rows", async () => {
    const tenantA = await createTenant("Tenant-A");
    const tenantB = await createTenant("Tenant-B");

    const branchA = await withTenant(tenantA.id, (tx) =>
      tx.branch.create({
        data: { tenantId: tenantA.id, name: "Branch A", code: "A1" },
      })
    );
    const branchB = await withTenant(tenantB.id, (tx) =>
      tx.branch.create({
        data: { tenantId: tenantB.id, name: "Branch B", code: "B1" },
      })
    );

    const rowsSeenByA = await withTenant(tenantA.id, (tx) =>
      tx.branch.findMany({ where: { id: { in: [branchA.id, branchB.id] } } })
    );

    expect(rowsSeenByA.map((row) => row.id)).toEqual([branchA.id]);
  });

  it("rejects inserting a row under a mismatched tenant context (WITH CHECK)", async () => {
    const tenantA = await createTenant("Tenant-C");
    const tenantB = await createTenant("Tenant-D");

    await expect(
      withTenant(tenantA.id, (tx) =>
        tx.branch.create({
          data: { tenantId: tenantB.id, name: "Cross-tenant branch", code: "X1" },
        })
      )
    ).rejects.toThrow();
  });

  it("RLS blocks a deliberately unscoped query (no app.tenant_id set)", async () => {
    const tenantA = await createTenant("Tenant-E");
    await withTenant(tenantA.id, (tx) =>
      tx.branch.create({
        data: { tenantId: tenantA.id, name: "Unscoped-check Branch", code: "U1" },
      })
    );

    // Deliberately bypass withTenant — no SET LOCAL app.tenant_id on this connection.
    const rows = await prisma.branch.findMany({
      where: { tenantId: tenantA.id },
    });

    expect(rows).toHaveLength(0);
  });

  it("RLS also isolates the Unit 03 identity tables (User/Role)", async () => {
    const tenantA = await createTenant("Tenant-F");
    const tenantB = await createTenant("Tenant-G");

    const userA = await withTenant(tenantA.id, (tx) =>
      tx.user.create({ data: { tenantId: tenantA.id, name: "User A", email: `a-${randomUUID()}@test.dev` } })
    );
    const userB = await withTenant(tenantB.id, (tx) =>
      tx.user.create({ data: { tenantId: tenantB.id, name: "User B", email: `b-${randomUUID()}@test.dev` } })
    );

    const rowsSeenByA = await withTenant(tenantA.id, (tx) =>
      tx.user.findMany({ where: { id: { in: [userA.id, userB.id] } } })
    );
    expect(rowsSeenByA.map((row) => row.id)).toEqual([userA.id]);

    const unscopedRows = await prisma.user.findMany({ where: { id: { in: [userA.id, userB.id] } } });
    expect(unscopedRows).toHaveLength(0);
  });
});
