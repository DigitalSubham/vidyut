/**
 * Unit 34's RBAC coverage cross-check (context/rbac.md). Every unit already
 * tests its own permission gates — this instead catches a different, subtle
 * bug: a permission string documented in rbac.md's matrix that no route in
 * the codebase actually enforces (a documented-but-unenforced permission).
 */

/**
 * Every literal permission string enforced across `sources` — either the
 * route-level `requirePermission("...")` middleware, or the inline
 * `userHasPermission(auth, "...")` check some services use for an "either
 * of two permissions" gate (e.g. Unit 28's dashboard: owner OR principal).
 */
export function findEnforcedPermissions(sources: string[]): Set<string> {
  const enforced = new Set<string>();
  const patterns = [/requirePermission\(\s*"([\w.]+)"\s*\)/g, /userHasPermission\([^,]+,\s*"([\w.]+)"\s*\)/g];
  for (const source of sources) {
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source)) !== null) {
        enforced.add(match[1]!);
      }
    }
  }
  return enforced;
}

/** Permissions in `allPermissions` with no matching requirePermission() call in `sources`. */
export function findUnenforcedPermissions(allPermissions: readonly string[], sources: string[]): string[] {
  const enforced = findEnforcedPermissions(sources);
  return allPermissions.filter((permission) => !enforced.has(permission));
}
