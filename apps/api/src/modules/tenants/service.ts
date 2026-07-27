import { prisma } from "@vidyut/db";
import { AppError } from "../../core/errors";
import type { RequestAuth } from "../../core/guards/types";

/** Public — resolves a schoolCode to the tenantSlug the mobile app's existing OTP endpoints already accept. */
export async function resolveSchoolCode(schoolCode: string): Promise<{ tenantSlug: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { schoolCode: schoolCode.toUpperCase() } });
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    throw new AppError("NOT_FOUND", "tenant.errors.schoolCodeNotFound");
  }
  return { tenantSlug: tenant.slug };
}

/**
 * The tenant's own current subscription + plan (Unit 34 — closes the
 * `subscription.view` RBAC gap). `Tenant`/`Subscription`/`Plan` are
 * platform-managed, no-RLS tables (context/data-model.md §13) — plain
 * prisma calls scoped explicitly by `auth.tenantId`, same posture as every
 * other platform-table read in this codebase.
 */
export async function getMySubscription(auth: RequestAuth) {
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: auth.tenantId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (!subscription) {
    throw new AppError("NOT_FOUND", "platform.errors.subscriptionNotFound");
  }
  return subscription;
}
