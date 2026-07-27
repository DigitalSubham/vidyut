import {
  generateSchoolCode,
  nextPlatformInvoiceNumber,
  prisma,
  withTenant,
  seedDefaultRoles,
  seedModuleToggles,
  Prisma,
} from "@vidyut/db";
import type {
  CreatePlatformInvoiceInput,
  CreateTenantInput,
  ListTenantsQueryInput,
  PatchPlatformInvoiceStatusInput,
  PatchTenantInput,
  PlatformLoginInput,
  RevenueSummaryQueryInput,
  WalletRechargeInput,
} from "@vidyut/validation";
import type { ModuleKey } from "@vidyut/types";
import { AppError } from "../../core/errors";
import { hashPassword, verifyPassword } from "../../core/auth/password";
import { signPlatformAccessToken } from "../../core/auth/platform-jwt";
import { signAccessToken } from "../../core/auth/jwt";
import { loadUserAuthContext } from "../../core/auth/tokens";
import { enqueue } from "../../core/jobs";

function currentAcademicSession(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const isBeforeApril = referenceDate.getUTCMonth() < 3; // getUTCMonth is 0-indexed; 3 = April
  const startYear = isBeforeApril ? year - 1 : year;
  const endYear = startYear + 1;
  return {
    name: `${startYear}-${String(endYear).slice(2)}`,
    startDate: new Date(Date.UTC(startYear, 3, 1)),
    endDate: new Date(Date.UTC(endYear, 2, 31)),
  };
}

export async function platformLogin(input: PlatformLoginInput): Promise<{ accessToken: string }> {
  const platformUser = await prisma.platformUser.findUnique({ where: { email: input.email } });
  const passwordOk = platformUser
    ? await verifyPassword(platformUser.passwordHash, input.password)
    : false;

  if (!platformUser || !passwordOk) {
    throw new AppError("UNAUTHENTICATED", "platform.errors.invalidCredentials");
  }

  const accessToken = await signPlatformAccessToken({ sub: platformUser.id, role: "SUPERADMIN" });
  return { accessToken };
}

export async function createTenant(input: CreateTenantInput, actorPlatformUserId: string) {
  const existingSlug = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existingSlug) {
    throw new AppError("CONFLICT", "platform.errors.slugTaken");
  }

  const plan = await prisma.plan.findUnique({ where: { key: input.planKey } });
  if (!plan) {
    throw new AppError("NOT_FOUND", "platform.errors.planNotFound");
  }

  const schoolCode = await generateSchoolCode();
  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      schoolCode,
      status: "ACTIVE",
      planId: plan.id,
      appType: plan.appType,
      locale: "en",
    },
  });

  const branch = await withTenant(tenant.id, (tx) =>
    tx.branch.create({
      data: {
        tenantId: tenant.id,
        name: input.branchName ?? `${input.name} — Main Branch`,
        code: input.branchCode ?? "MAIN",
        board: "CBSE",
        isActive: true,
      },
    })
  );

  const session = currentAcademicSession();
  await withTenant(tenant.id, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: session.name,
        startDate: session.startDate,
        endDate: session.endDate,
        isCurrent: true,
      },
    })
  );

  const roleByKey = await seedDefaultRoles(tenant.id);
  await seedModuleToggles(tenant.id, input.planKey);

  const ownerPasswordHash = await hashPassword(input.ownerPassword);
  const owner = await withTenant(tenant.id, (tx) =>
    tx.user.create({
      data: {
        tenantId: tenant.id,
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash: ownerPasswordHash,
        status: "ACTIVE",
      },
    })
  );
  await withTenant(tenant.id, (tx) =>
    tx.userRole.create({
      data: { tenantId: tenant.id, userId: owner.id, roleId: roleByKey.OWNER, branchId: null },
    })
  );
  await withTenant(tenant.id, (tx) =>
    tx.branchMembership.create({
      data: { tenantId: tenant.id, userId: owner.id, branchId: branch.id },
    })
  );

  await prisma.smsWallet.create({ data: { tenantId: tenant.id, balancePaise: 0 } });

  // Unit 30: no Subscription row was ever created here before — Tenant.planId
  // tracked the plan but nothing tracked the billing period. One ACTIVE
  // subscription per tenant, a 1-year period matching plans-entitlements.md's
  // annual pricing.
  const periodEnd = new Date(tenant.createdAt);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: periodEnd },
  });

  // app_type branches onboarding (context/plans-entitlements.md rule 3): shared
  // is immediately usable; dedicated gets an AppBuild record + a stubbed job
  // (the real EAS pipeline is Unit 31 — this only proves enqueue works).
  let appBuild = null;
  if (plan.appType === "DEDICATED") {
    appBuild = await prisma.appBuild.create({
      data: { tenantId: tenant.id, platform: "ANDROID", mode: "DEDICATED", storeStatus: "PENDING" },
    });
    await enqueue("appbuild.generate", { tenantId: tenant.id, appBuildId: appBuild.id });
  }

  await withTenant(tenant.id, (tx) =>
    tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: actorPlatformUserId,
        actorType: "PLATFORM_USER",
        action: "tenant.create",
        entity: "Tenant",
        entityId: tenant.id,
        after: { name: tenant.name, slug: tenant.slug, planKey: input.planKey, appType: tenant.appType },
      },
    })
  );

  return { tenant, branch, owner: { id: owner.id, email: owner.email }, appBuild };
}

export async function listTenants(query: ListTenantsQueryInput) {
  const where = query.status ? { status: query.status } : {};
  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: { plan: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.tenant.count({ where }),
  ]);
  return { items, total };
}

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  if (!tenant) {
    throw new AppError("NOT_FOUND", "platform.errors.tenantNotFound");
  }
  return tenant;
}

export async function patchTenant(
  tenantId: string,
  input: PatchTenantInput,
  actorPlatformUserId: string
) {
  const tenant = await getTenant(tenantId);
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (input.status) {
    before.status = tenant.status;
    after.status = input.status;
    await prisma.tenant.update({ where: { id: tenantId }, data: { status: input.status } });
  }

  if (input.planKey) {
    const plan = await prisma.plan.findUnique({ where: { key: input.planKey } });
    if (!plan) {
      throw new AppError("NOT_FOUND", "platform.errors.planNotFound");
    }
    before.planId = tenant.planId;
    after.planKey = input.planKey;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { planId: plan.id, appType: plan.appType },
    });
    await seedModuleToggles(tenantId, input.planKey); // re-seed = reset to the new plan's defaults

    // Keep the active Subscription's planId in sync with the tenant's plan
    // change (Unit 30) — the period itself isn't reset, only which plan it bills.
    const activeSubscription = await prisma.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    if (activeSubscription) {
      await prisma.subscription.update({ where: { id: activeSubscription.id }, data: { planId: plan.id } });
    }
  }

  if (input.moduleOverride) {
    const moduleKey = input.moduleOverride.moduleKey as ModuleKey;
    before.moduleOverride = null;
    after.moduleOverride = input.moduleOverride;
    await prisma.moduleToggle.upsert({
      where: { tenantId_moduleKey: { tenantId, moduleKey } },
      update: { enabled: input.moduleOverride.enabled },
      create: { tenantId, moduleKey, enabled: input.moduleOverride.enabled },
    });
  }

  await withTenant(tenantId, (tx) =>
    tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorPlatformUserId,
        actorType: "PLATFORM_USER",
        action: "tenant.patch",
        entity: "Tenant",
        entityId: tenantId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
      },
    })
  );

  return getTenant(tenantId);
}

export async function getTenantUsage(tenantId: string) {
  const tenant = await getTenant(tenantId);
  const [userCount, branchCount, studentCount] = await withTenant(tenantId, (tx) =>
    Promise.all([tx.user.count(), tx.branch.count(), tx.student.count({ where: { status: "ACTIVE" } })])
  );
  const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });

  return {
    // Unit 30 fix — this used to be hardcoded 0 with a stale "Student model
    // doesn't exist until Unit 07" comment; Unit 07 has been done for a while.
    students: { used: studentCount, limit: tenant.plan?.studentLimit ?? null },
    users: { used: userCount, limit: tenant.plan?.userLimit ?? null },
    branches: { used: branchCount, limit: tenant.plan?.branchLimit ?? null },
    // No Document/storage-accounting model yet — wired to real usage later.
    storageGb: { used: 0, limit: tenant.plan?.storageGb ?? null },
    smsWalletBalancePaise: wallet?.balancePaise ?? 0,
  };
}

export async function impersonateUser(
  tenantId: string,
  targetUserId: string,
  actorPlatformUserId: string
): Promise<{ accessToken: string }> {
  const user = await withTenant(tenantId, (tx) => tx.user.findUnique({ where: { id: targetUserId } }));
  if (!user) {
    throw new AppError("NOT_FOUND", "platform.errors.userNotFound");
  }

  await withTenant(tenantId, (tx) =>
    tx.auditLog.create({
      data: {
        tenantId,
        actorId: actorPlatformUserId,
        actorType: "PLATFORM_USER",
        action: "tenant.impersonate",
        entity: "User",
        entityId: targetUserId,
      },
    })
  );

  // Access token only, no refresh — impersonation is time-boxed by design
  // (context/feature-specs/05-superadmin-tenants-plans.md), not a persistent session.
  const ctx = await loadUserAuthContext(tenantId, targetUserId);
  const accessToken = await signAccessToken({
    sub: ctx.userId,
    tenantId: ctx.tenantId,
    roles: ctx.roles,
    branchIds: ctx.branchIds,
  });
  return { accessToken };
}

// --- Unit 30: Billing & Subscriptions ---

async function getActiveSubscriptionOrThrow(tenantId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    throw new AppError("NOT_FOUND", "platform.errors.subscriptionNotFound");
  }
  return subscription;
}

export async function createPlatformInvoice(tenantId: string, input: CreatePlatformInvoiceInput) {
  await getTenant(tenantId); // 404s if the tenant doesn't exist
  const subscription = await getActiveSubscriptionOrThrow(tenantId);
  const invoiceNo = await nextPlatformInvoiceNumber();

  return prisma.platformInvoice.create({
    data: {
      tenantId,
      subscriptionId: subscription.id,
      invoiceNo,
      amount: input.amount,
      dueDate: input.dueDate,
    },
  });
}

export async function listPlatformInvoices(tenantId: string) {
  return prisma.platformInvoice.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function patchPlatformInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  input: PatchPlatformInvoiceStatusInput
) {
  const invoice = await prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.tenantId !== tenantId) {
    throw new AppError("NOT_FOUND", "platform.errors.invoiceNotFound");
  }

  return prisma.platformInvoice.update({
    where: { id: invoiceId },
    data: {
      status: input.status,
      paidAt: input.status === "PAID" ? new Date() : invoice.paidAt,
    },
  });
}

export async function rechargeWallet(tenantId: string, input: WalletRechargeInput) {
  await getTenant(tenantId);

  const [wallet] = await prisma.$transaction([
    prisma.smsWallet.upsert({
      where: { tenantId },
      update: { balancePaise: { increment: input.amountPaise } },
      create: { tenantId, balancePaise: input.amountPaise },
    }),
    prisma.walletTxn.create({
      data: { tenantId, type: "CREDIT", amount: input.amountPaise, reason: input.reason },
    }),
  ]);

  return wallet;
}

export async function getRevenueSummary(query: RevenueSummaryQueryInput) {
  const createdAtFilter =
    query.from || query.to
      ? { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) }
      : undefined;

  const subscriptionRevenue = await prisma.platformInvoice.aggregate({
    where: { status: "PAID", ...(createdAtFilter ? { paidAt: createdAtFilter } : {}) },
    _sum: { amount: true },
  });

  // Payment.platformFeeAmount is tenant-RLS'd (Unit 13) — no cross-tenant
  // bypass exists, so summing it means one withTenant() aggregate per tenant.
  const tenantIds = (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id);
  let platformFeeTotal = 0;
  for (const tenantId of tenantIds) {
    const sum = await withTenant(tenantId, (tx) =>
      tx.payment.aggregate({
        where: {
          status: "SUCCESS",
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        },
        _sum: { platformFeeAmount: true },
      })
    );
    platformFeeTotal += sum._sum?.platformFeeAmount ?? 0;
  }

  return {
    subscriptionRevenuePaise: subscriptionRevenue._sum.amount ?? 0,
    platformFeeRevenuePaise: platformFeeTotal,
  };
}
