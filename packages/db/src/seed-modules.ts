import { DEFAULT_PLAN_MODULES, MODULE_KEYS, type PlanKey } from "@vidyut/types";
import { withTenant } from "./with-tenant";

/**
 * Resets every ModuleToggle row for a tenant to the given plan's defaults —
 * called at tenant creation and on a plan change (context/plans-entitlements.md
 * rule 1: "Plan change re-seeds toggles"). A manual per-tenant override made
 * via the platform PATCH endpoint is untouched by any *other* action; only
 * calling this again (i.e. another plan change) resets it.
 *
 * ModuleToggle carries no RLS (context/data-model.md §13), but writes here
 * still go through withTenant for consistency with the rest of onboarding —
 * harmless since it's a plain transaction either way.
 */
export async function seedModuleToggles(tenantId: string, planKey: PlanKey): Promise<void> {
  const enabledModules = new Set(DEFAULT_PLAN_MODULES[planKey]);

  await withTenant(tenantId, async (tx) => {
    for (const moduleKey of MODULE_KEYS) {
      await tx.moduleToggle.upsert({
        where: { tenantId_moduleKey: { tenantId, moduleKey } },
        update: { enabled: enabledModules.has(moduleKey) },
        create: { tenantId, moduleKey, enabled: enabledModules.has(moduleKey) },
      });
    }
  });
}
