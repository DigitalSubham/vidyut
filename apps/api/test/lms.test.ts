import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

async function setup(namePrefix: string) {
  const tenant = await createTenant(namePrefix);
  tenantIds.push(tenant.id);
  const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["lms.manage"]);
  const owner = await ownerToken(tenant.id);
  const branch = await createBranch(tenant.id, "A");
  const klass = await withTenant(tenant.id, (tx) => tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "6", order: 6 } }));
  const section = await withTenant(tenant.id, (tx) => tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: klass.id, name: "A" } }));
  const subject = await withTenant(tenant.id, (tx) =>
    tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Science", code: "SCI" } })
  );
  const staffUser = await createStaffUser(tenant.id, { email: `teacher@${namePrefix}.com`, password: "Passw0rd!", roleId: ownerRole.id, branchId: branch.id });
  const staff = await withTenant(tenant.id, (tx) =>
    tx.staff.create({
      data: { tenantId: tenant.id, branchId: branch.id, userId: staffUser.id, employeeNo: "EMP-L1", designation: "Teacher", type: "TEACHING", joinedAt: new Date("2024-01-01") },
    })
  );
  const teacherToken = await signAccessToken({ sub: staffUser.id, tenantId: tenant.id, roles: ["OWNER"], branchIds: [branch.id] });
  return { tenant, branch, klass, section, subject, staff, owner, teacherToken };
}

describe("lms — syllabus chapters (scope #1)", () => {
  it("creates, lists, and marks a chapter complete", async () => {
    const { tenant, branch, klass, subject, owner } = await setup("lms-syllabus-tenant");

    const createRes = await request(app)
      .post("/api/v1/lms/syllabus-chapters")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, subjectId: subject.id, classId: klass.id, title: "Chapter 1: Light", order: 1 });
    expect(createRes.status).toBe(201);
    const chapterId = createRes.body.data.id as string;

    const completeRes = await request(app)
      .post(`/api/v1/lms/syllabus-chapters/${chapterId}/complete`)
      .set("Authorization", `Bearer ${owner}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.completedAt).not.toBeNull();

    const listRes = await request(app)
      .get(`/api/v1/lms/syllabus-chapters?subjectId=${subject.id}&classId=${klass.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);

    void tenant;
  });
});

describe("lms — lesson plans (scope #2, no approval gate)", () => {
  it("a teacher creates a lesson plan for their own staffId, resolved from the authenticated user", async () => {
    const { branch, section, subject, staff, teacherToken } = await setup("lms-lessonplan-tenant");

    const createRes = await request(app)
      .post("/api/v1/lms/lesson-plans")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ branchId: branch.id, subjectId: subject.id, sectionId: section.id, date: "2026-08-20", topic: "Reflection of light" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.staffId).toBe(staff.id);

    const listRes = await request(app)
      .get(`/api/v1/lms/lesson-plans?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });
});

describe("lms — content library (scope #3, doc/link only)", () => {
  it("creates a LINK content item and rejects a FILE item with no fileUrl", async () => {
    const { branch, klass, subject, owner } = await setup("lms-content-tenant");

    const linkRes = await request(app)
      .post("/api/v1/lms/content-items")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, subjectId: subject.id, classId: klass.id, title: "NCERT Ch 1 video", type: "LINK", linkUrl: "https://youtube.com/watch?v=x" });
    expect(linkRes.status).toBe(201);

    const badRes = await request(app)
      .post("/api/v1/lms/content-items")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, subjectId: subject.id, classId: klass.id, title: "Bad", type: "FILE" });
    expect(badRes.status).toBe(400);

    const listRes = await request(app)
      .get(`/api/v1/lms/content-items?subjectId=${subject.id}&classId=${klass.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
  });
});

describe("lms — live class links (scope #4, link-out only)", () => {
  it("schedules a live class with an externally-created join link", async () => {
    const { branch, section, subject, owner } = await setup("lms-liveclass-tenant");

    const createRes = await request(app)
      .post("/api/v1/lms/live-classes")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, sectionId: section.id, subjectId: subject.id, startTime: "2026-08-20T10:00:00Z", joinUrl: "https://meet.google.com/abc-defg-hij" });
    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/lms/live-classes?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
  });
});

describe("lms — RBAC", () => {
  it("a caller without lms.manage is denied", async () => {
    const tenant = await createTenant("lms-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/lms/lesson-plans")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, subjectId: "x", sectionId: "y", date: "2026-08-20", topic: "Z" });
    expect(res.status).toBe(403);
  });
});
