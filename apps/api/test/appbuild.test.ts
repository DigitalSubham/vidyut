import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Worker } from "bullmq";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signPlatformAccessToken } from "../src/core/auth/platform-jwt";
import { cleanupPlatformUser, cleanupTenant, createPlatformUser } from "./helpers";

const app = createApp();
let worker: Worker;
const tenantIds: string[] = [];
const platformUserIds: string[] = [];

beforeAll(() => {
  worker = startWorker();
});

afterAll(async () => {
  await worker.close();
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  for (const id of platformUserIds) {
    await cleanupPlatformUser(id);
  }
  await prisma.$disconnect();
});

async function waitForStoreStatus(appBuildId: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const build = await prisma.appBuild.findUnique({ where: { id: appBuildId } });
    if (build && build.storeStatus !== "PENDING") return build;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`AppBuild ${appBuildId} did not leave PENDING within ${timeoutMs}ms`);
}

describe("appbuild.generate (Unit 31)", () => {
  it("fails clearly instead of faking success when EAS credentials aren't configured", async () => {
    // This test environment has no EAS_ROBOT_ACCESS_TOKEN/EAS_PROJECT_ID set
    // (matches the real current state per context/prerequisites.md — no
    // Apple/Google developer account exists yet) — the honest outcome is a
    // clearly-FAILED build, never a silent PENDING no-op that looks fine.
    expect(process.env.EAS_ROBOT_ACCESS_TOKEN).toBeUndefined();

    const platformUser = await createPlatformUser({
      email: `super-${randomUUID()}@vidyut.test`,
      password: "SuperSecret123!",
    });
    platformUserIds.push(platformUser.id);
    const accessToken = await signPlatformAccessToken({ sub: platformUser.id, role: "SUPERADMIN" });

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Dedicated School",
        slug: `dedicated-${randomUUID()}`,
        planKey: "ENTERPRISE",
        ownerName: "Owner",
        ownerEmail: `owner-${randomUUID()}@dedicated.test`,
        ownerPassword: "OwnerSecret123!",
      });
    tenantIds.push(createRes.body.data.tenant.id);
    const appBuildId = createRes.body.data.appBuild.id as string;

    const settled = await waitForStoreStatus(appBuildId);
    expect(settled.storeStatus).toBe("FAILED");
  });
});
