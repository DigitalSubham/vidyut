import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { generateSchoolCode, prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { cleanupTenant, createBranch, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function createTenantWithSchoolCode(namePrefix: string) {
  const tenant = await createTenant(namePrefix);
  const schoolCode = await generateSchoolCode();
  const updated = await prisma.tenant.update({ where: { id: tenant.id }, data: { schoolCode } });
  return updated;
}

describe("public — school info + admission intake (no auth), rate-limited", () => {
  it("resolves a real school's public info by schoolCode", async () => {
    const tenant = await createTenantWithSchoolCode("public-info-tenant");
    tenantIds.push(tenant.id);
    await createBranch(tenant.id, "A");

    const res = await request(app).get(`/api/v1/public/schools/${tenant.schoolCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(tenant.name);
    expect(res.body.data.branches).toHaveLength(1);
  });

  it("404s an unknown schoolCode", async () => {
    const res = await request(app).get("/api/v1/public/schools/ZZZZZZ");
    expect(res.status).toBe(404);
  });

  it("submitting the admission form creates a real Enquiry visible to staff-facing admissions", async () => {
    const tenant = await createTenantWithSchoolCode("public-admission-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const res = await request(app)
      .post(`/api/v1/public/admissions/${tenant.schoolCode}`)
      .send({ childName: "Aarav", guardianName: "Ramesh", phone: "+919812340077", source: "website" });
    expect(res.status).toBe(201);

    const enquiries = await withTenant(tenant.id, (tx) => tx.enquiry.findMany({ where: { branchId: branch.id } }));
    expect(enquiries).toHaveLength(1);
    expect(enquiries[0]?.childName).toBe("Aarav");
  });

  it("rate-limits the public admission endpoint more strictly than authenticated endpoints", async () => {
    const tenant = await createTenantWithSchoolCode("public-ratelimit-tenant");
    tenantIds.push(tenant.id);
    await createBranch(tenant.id, "A");

    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .post(`/api/v1/public/admissions/${tenant.schoolCode}`)
          .send({ childName: "C", guardianName: "G", phone: "+919812340088", source: "website" })
      )
    );
    const rateLimited = attempts.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
