/**
 * Unit 34's cross-cutting withTenant() check (AGENTS.md invariant #1). Not a
 * re-test of every unit's own RLS test — those already exist per-module.
 * This walks every service file and flags a Prisma call made directly on
 * the imported `prisma` singleton (not the `tx` handed in by withTenant())
 * against a model that isn't platform-managed — the one class of bug no
 * single unit's own test can catch: a *future* unit forgetting withTenant().
 */

/** Platform-managed tables with no RLS (context/data-model.md §13) — legitimately accessed via the bare `prisma` client, never `withTenant()`. */
export const PLATFORM_MODELS = [
  "tenant",
  "platformUser",
  "plan",
  "subscription",
  "moduleToggle",
  "smsWallet",
  "appBuild",
  "platformInvoice",
  "walletTxn",
] as const;

/**
 * Returns every `prisma.<model>.` call site found in `source` whose model
 * isn't in `allowedModels` — i.e. a tenant-owned table read/written outside
 * withTenant(). Deliberately regex-based (not a full TS parse) — simple,
 * fast, and sufficient for "does this identifier appear," matching the
 * scope of a lint-style check per this unit's own Open Question 1.
 */
export function findUnscopedPrismaCalls(
  source: string,
  allowedModels: readonly string[] = PLATFORM_MODELS
): string[] {
  const violations: string[] = [];
  const pattern = /\bprisma\.([a-zA-Z][a-zA-Z0-9]*)\./g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const model = match[1]!;
    if (!allowedModels.includes(model)) {
      violations.push(model);
    }
  }
  return violations;
}
