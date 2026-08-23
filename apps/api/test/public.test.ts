import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { generateSchoolCode, prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

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

  it("a published PublicNotice is visible on the public notices endpoint", async () => {
    const tenant = await createTenantWithSchoolCode("public-notices-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await signAccessToken({ sub: "owner-1", tenantId: tenant.id, roles: ["OWNER"], branchIds: [] });

    const createRes = await request(app)
      .post("/api/v1/public-notices")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Admissions open", body: "For 2026-27" });
    expect(createRes.status).toBe(201);

    const res = await request(app).get(`/api/v1/public/notices/${tenant.schoolCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Admissions open");
  });

  it("only public-flagged gallery albums appear on the public gallery endpoint", async () => {
    const tenant = await createTenantWithSchoolCode("public-gallery-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await withTenant(tenant.id, (tx) =>
      tx.galleryAlbum.create({ data: { tenantId: tenant.id, branchId: branch.id, title: "Public Album", isPublic: true } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.galleryAlbum.create({ data: { tenantId: tenant.id, branchId: branch.id, title: "Private Album", isPublic: false } })
    );

    const res = await request(app).get(`/api/v1/public/gallery/${tenant.schoolCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Public Album");
  });

  it("returns the tenant's contact info + active branches on the public contact endpoint", async () => {
    const tenant = await createTenantWithSchoolCode("public-contact-tenant");
    tenantIds.push(tenant.id);
    await createBranch(tenant.id, "A");
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { contactPhone: "+919812340000", contactEmail: "school@example.com", address: "Patna" },
    });

    const res = await request(app).get(`/api/v1/public/contact/${tenant.schoolCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe("+919812340000");
    expect(res.body.data.email).toBe("school@example.com");
    expect(res.body.data.branches).toHaveLength(1);
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
