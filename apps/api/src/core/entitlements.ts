import { prisma } from "@vidyut/db";
import type { ModuleKey } from "@vidyut/types";
import { AppError } from "./errors";

export type LimitKind = "students" | "users" | "branches" | "storage";

/**
 * Platform tables (Plan/ModuleToggle) carry no RLS (context/data-model.md
 * §13) — these are plain, tenantId-filtered queries, not withTenant() calls.
 * Used by every module's route guards to hide/block disabled features and
 * over-limit actions (context/api-conventions.md: MODULE_DISABLED,
 * LIMIT_EXCEEDED).
 */
export async function isModuleEnabled(tenantId: string, moduleKey: ModuleKey): Promise<boolean> {
  const toggle = await prisma.moduleToggle.findUnique({
    where: { tenantId_moduleKey: { tenantId, moduleKey } },
  });
  return toggle?.enabled ?? false;
}

export async function requireModuleEnabled(tenantId: string, moduleKey: ModuleKey): Promise<void> {
  const enabled = await isModuleEnabled(tenantId, moduleKey);
  if (!enabled) {
    throw new AppError("MODULE_DISABLED", "platform.errors.moduleDisabled");
  }
}

function limitFieldFor(kind: LimitKind): "studentLimit" | "userLimit" | "branchLimit" | "storageGb" {
  switch (kind) {
    case "students":
      return "studentLimit";
    case "users":
      return "userLimit";
    case "branches":
      return "branchLimit";
    case "storage":
      return "storageGb";
  }
}

/** Throws 403 LIMIT_EXCEEDED (with an upgrade hint) if currentCount is already at/over the tenant's plan limit. */
export async function assertWithinLimit(
  tenantId: string,
  kind: LimitKind,
  currentCount: number
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  const limit = tenant?.plan ? tenant.plan[limitFieldFor(kind)] : null;
  if (limit == null) {
    return; // no plan, or unlimited (Enterprise) — nothing to enforce
  }

  if (currentCount >= limit) {
    throw new AppError("LIMIT_EXCEEDED", "platform.errors.limitExceeded", {
      kind,
      limit: String(limit),
      upgradeHint: "platform.hints.upgradePlan",
    });
  }
}
