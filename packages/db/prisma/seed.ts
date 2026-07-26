import * as argon2 from "argon2";
import { DEFAULT_PLAN_MODULES, PLAN_LIMITS, type PlanKey } from "@vidyut/types";
import { prisma } from "../src/client";
import { withTenant } from "../src/with-tenant";
import { seedDefaultRoles } from "../src/seed-roles";
import { seedModuleToggles } from "../src/seed-modules";

/**
 * Canonical launch prices (context/plans-entitlements.md — bands, one
 * concrete figure picked per plan as the doc instructs). Enterprise is
 * explicitly "custom" in the market research; ₹1,00,000/₹20,000 here are a
 * clearly-placeholder seed value, never charged as-is — real Enterprise
 * deals are quoted manually. Confirm all four again before Unit 30 (billing).
 */
const PLAN_PRICING: Record<PlanKey, { priceYear: number; setupFee: number }> = {
  STARTER: { priceYear: 7_999_00, setupFee: 2_000_00 },
  STANDARD: { priceYear: 18_000_00, setupFee: 5_000_00 },
  PRO: { priceYear: 36_000_00, setupFee: 8_000_00 },
  ENTERPRISE: { priceYear: 1_00_000_00, setupFee: 20_000_00 },
};

async function seedPlans() {
  for (const key of Object.keys(PLAN_PRICING) as PlanKey[]) {
    const pricing = PLAN_PRICING[key];
    const limits = PLAN_LIMITS[key];
    await prisma.plan.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: key.charAt(0) + key.slice(1).toLowerCase(),
        priceYear: pricing.priceYear,
        setupFee: pricing.setupFee,
        studentLimit: limits.studentLimit,
        userLimit: limits.userLimit,
        branchLimit: limits.branchLimit,
        storageGb: limits.storageGb,
        appType: key === "ENTERPRISE" ? "DEDICATED" : "SHARED",
        modules: DEFAULT_PLAN_MODULES[key],
      },
    });
  }
}

async function main() {
  await seedPlans();
  const standardPlan = await prisma.plan.findUniqueOrThrow({ where: { key: "STANDARD" } });

  // Tenant is platform-level (no RLS) — direct access is fine.
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-school" },
    update: {},
    create: {
      name: "Demo School",
      slug: "demo-school",
      status: "TRIAL",
      planId: standardPlan.id,
      appType: "SHARED",
      locale: "en",
    },
  });

  await seedModuleToggles(tenant.id, "STANDARD");

  // Branch and AcademicSession are tenant-owned and RLS-scoped — every access
  // goes through withTenant(), including seeding.
  const branch = await withTenant(tenant.id, (tx) =>
    tx.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo School — Main Branch",
        code: "MAIN",
        board: "CBSE",
        isActive: true,
      },
    })
  );

  await withTenant(tenant.id, (tx) =>
    tx.academicSession.upsert({
      where: { branchId_name: { branchId: branch.id, name: "2026-27" } },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: "2026-27",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    })
  );

  // Default system roles + their permission grid (context/rbac.md), owner-editable afterwards.
  const roleByKey = await seedDefaultRoles(tenant.id);

  // Demo OWNER login (dev credentials — never used outside local/demo seeding).
  const ownerPasswordHash = await argon2.hash("Owner@12345", { type: argon2.argon2id });
  const owner = await withTenant(tenant.id, (tx) =>
    tx.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "owner@demo-school.test" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo Owner",
        email: "owner@demo-school.test",
        passwordHash: ownerPasswordHash,
        status: "ACTIVE",
      },
    })
  );
  const ownerRoleId = roleByKey.OWNER;
  // Prisma's compound-unique upsert filter can't take a literal null for
  // branchId, so OWNER (tenant-wide, branchId: null) is upserted manually.
  await withTenant(tenant.id, async (tx) => {
    const existing = await tx.userRole.findFirst({
      where: { userId: owner.id, roleId: ownerRoleId, branchId: null },
    });
    if (!existing) {
      await tx.userRole.create({
        data: { tenantId: tenant.id, userId: owner.id, roleId: ownerRoleId, branchId: null },
      });
    }
  });
  await withTenant(tenant.id, (tx) =>
    tx.branchMembership.upsert({
      where: { userId_branchId: { userId: owner.id, branchId: branch.id } },
      update: {},
      create: { tenantId: tenant.id, userId: owner.id, branchId: branch.id },
    })
  );

  // Demo PARENT login (OTP-based — no password), for manual/dev OTP testing.
  const parent = await withTenant(tenant.id, (tx) =>
    tx.user.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: "+919999999999" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo Parent",
        phone: "+919999999999",
        status: "ACTIVE",
      },
    })
  );
  const parentRoleId = roleByKey.PARENT;
  await withTenant(tenant.id, (tx) =>
    tx.userRole.upsert({
      where: {
        userId_roleId_branchId: { userId: parent.id, roleId: parentRoleId, branchId: branch.id },
      },
      update: {},
      create: { tenantId: tenant.id, userId: parent.id, roleId: parentRoleId, branchId: branch.id },
    })
  );
  await withTenant(tenant.id, (tx) =>
    tx.branchMembership.upsert({
      where: { userId_branchId: { userId: parent.id, branchId: branch.id } },
      update: {},
      create: { tenantId: tenant.id, userId: parent.id, branchId: branch.id },
    })
  );

  // Demo super-admin login — platform-level, no tenantId (dev credentials only).
  const platformPasswordHash = await argon2.hash("SuperAdmin@12345", { type: argon2.argon2id });
  await prisma.platformUser.upsert({
    where: { email: "superadmin@vidyut.test" },
    update: {},
    create: {
      name: "Demo Super Admin",
      email: "superadmin@vidyut.test",
      passwordHash: platformPasswordHash,
      status: "ACTIVE",
    },
  });

  console.log(`Seeded demo tenant "${tenant.slug}" with branch "${branch.code}", roles, and demo users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
