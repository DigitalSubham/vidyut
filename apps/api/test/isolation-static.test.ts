import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@vidyut/types";
import { findUnscopedPrismaCalls, PLATFORM_MODELS } from "../src/core/checks/tenant-scope-check";
import { findUnenforcedPermissions } from "../src/core/checks/rbac-coverage-check";

const MODULES_DIR = path.resolve(__dirname, "../src/modules");

function moduleDirs(): string[] {
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function readAllServiceFiles(): { file: string; content: string }[] {
  return moduleDirs()
    .map((dir) => path.join(MODULES_DIR, dir, "service.ts"))
    .filter((file) => existsSync(file))
    .map((file) => ({ file, content: readFileSync(file, "utf8") }));
}

function readAllRouteFiles(): string[] {
  return moduleDirs()
    .map((dir) => path.join(MODULES_DIR, dir, "routes.ts"))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"));
}

describe("Unit 34 — withTenant() static check", () => {
  it("passes on the current, real codebase: every direct prisma.<model> call is a platform-managed table", () => {
    const serviceFiles = readAllServiceFiles();
    for (const { file, content } of serviceFiles) {
      const violations = findUnscopedPrismaCalls(content);
      expect(violations, `${file} has unscoped prisma calls: ${violations.join(", ")}`).toEqual([]);
    }
  });

  it("fails when a deliberately-introduced unscoped query is added to a test fixture", () => {
    const fixture = `
      import { prisma } from "@vidyut/db";
      export async function leakyFunction() {
        // A future unit forgetting withTenant() would look exactly like this.
        return prisma.student.findMany();
      }
    `;
    const violations = findUnscopedPrismaCalls(fixture);
    expect(violations).toEqual(["student"]);
  });

  it("does not flag legitimate platform-managed table access", () => {
    const fixture = `
      import { prisma } from "@vidyut/db";
      export async function legit() {
        return prisma.smsWallet.findUnique({ where: { tenantId: "x" } });
      }
    `;
    expect(findUnscopedPrismaCalls(fixture)).toEqual([]);
    expect(PLATFORM_MODELS).toContain("smsWallet");
  });
});

// Confirmed real gaps by this unit's own audit (not a checker bug): these
// four permissions are documented in rbac.md's matrix but no branch-
// management, settings-management, or user/role-management API exists yet
// anywhere in the codebase to enforce them against. Building those APIs is
// out of proportion for an audit unit ("an audit unit, not a new-feature
// unit" per this unit's own intro) — tracked as a real gap in
// progress-tracker.md rather than silently building four new modules here.
const KNOWN_UNBUILT_PERMISSION_GAPS = ["branch.manage", "settings.manage", "user.manage", "role.manage"];

describe("Unit 34 — RBAC coverage cross-check", () => {
  it("passes on the current, real codebase (excluding the confirmed, tracked gaps above): every other rbac.md permission has at least one enforcing route or service check", () => {
    const sources = [...readAllRouteFiles(), ...readAllServiceFiles().map((f) => f.content)];
    const checkedPermissions = PERMISSIONS.filter((p) => !KNOWN_UNBUILT_PERMISSION_GAPS.includes(p));
    const unenforced = findUnenforcedPermissions(checkedPermissions, sources);
    expect(unenforced, `Documented but unenforced permissions: ${unenforced.join(", ")}`).toEqual([]);
  });

  it("fails when a deliberately-removed requirePermission() call is simulated", () => {
    const sourcesWithoutOneRoute = [
      `router.post("/x", requirePermission("student.view"), handler);`,
      // "fee.setup" deliberately absent from every fixture source below.
    ];
    const unenforced = findUnenforcedPermissions(["student.view", "fee.setup"], sourcesWithoutOneRoute);
    expect(unenforced).toEqual(["fee.setup"]);
  });
});
