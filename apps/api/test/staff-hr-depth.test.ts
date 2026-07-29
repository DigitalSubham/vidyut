import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
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

async function ownerToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds });
}

async function createStaffViaApi(
  ownerJwt: string,
  branchId: string,
  opts: { employeeNo: string; email: string }
) {
  const res = await request(app)
    .post("/api/v1/staff")
    .set("Authorization", `Bearer ${ownerJwt}`)
    .send({
      branchId,
      role: "TEACHER",
      email: opts.email,
      password: "StaffPass123!",
      name: `Staff ${opts.employeeNo}`,
      employeeNo: opts.employeeNo,
      designation: "Teacher",
      type: "TEACHING",
      joinedAt: "2024-06-01",
    });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; userId: string };
}

describe("Unit 42 — Staff HR Depth (documents, staff attendance, staff ID cards)", () => {
  it("staff document upload: returns a real presigned URL and appends {key,label} to Staff.docs", async () => {
    const tenant = await createTenant("staff-docs-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const staff = await createStaffViaApi(owner, branch.id, { employeeNo: "DOC-1", email: "doc1@example.com" });

    const res = await request(app)
      .post(`/api/v1/staff/${staff.id}/documents`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ label: "Aadhaar Card", fileName: "aadhaar.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    expect(res.body.data.uploadUrl).toContain("http");
    expect(res.body.data.key).toContain(`staff-documents/${tenant.id}/${branch.id}/${staff.id}/`);

    const refreshed = await withTenant(tenant.id, (tx) => tx.staff.findUnique({ where: { id: staff.id } }));
    const docs = refreshed?.docs as Array<{ key: string; label: string }>;
    expect(docs).toHaveLength(1);
    expect(docs[0]?.label).toBe("Aadhaar Card");

    // A second upload appends, doesn't overwrite.
    await request(app)
      .post(`/api/v1/staff/${staff.id}/documents`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ label: "PAN Card", fileName: "pan.pdf" });
    const refreshedAgain = await withTenant(tenant.id, (tx) => tx.staff.findUnique({ where: { id: staff.id } }));
    expect((refreshedAgain?.docs as unknown[]).length).toBe(2);
  });

  it("staff attendance works the same way student attendance does: mark, upsert-on-remark, list, RBAC", async () => {
    const tenant = await createTenant("staff-attendance-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage", "attendance.mark", "attendance.view"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const staff = await createStaffViaApi(owner, branch.id, { employeeNo: "ATT-1", email: "att1@example.com" });

    const markRes = await request(app)
      .post("/api/v1/staff/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, date: "2026-01-05", records: [{ staffId: staff.id, status: "PRESENT" }] });
    expect(markRes.status).toBe(201);

    // Re-marking the same staff/day upserts, not duplicates.
    const remarkRes = await request(app)
      .post("/api/v1/staff/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, date: "2026-01-05", records: [{ staffId: staff.id, status: "LATE" }] });
    expect(remarkRes.status).toBe(201);

    const rows = await withTenant(tenant.id, (tx) =>
      tx.staffAttendanceRecord.findMany({ where: { staffId: staff.id } })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("LATE");

    const listRes = await request(app)
      .get("/api/v1/staff/attendance")
      .query({ branchId: branch.id, staffId: staff.id })
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const teacher = await signAccessToken({
      sub: "t1",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });
    const deniedRes = await request(app)
      .post("/api/v1/staff/attendance")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, date: "2026-01-06", records: [{ staffId: staff.id, status: "PRESENT" }] });
    expect(deniedRes.status).toBe(403);
  });

  it("staff ID card: issues through the same certificates register, doesn't collide with student certificates", async () => {
    const tenant = await createTenant("staff-idcard-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage", "certificate.issue"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const staff = await createStaffViaApi(owner, branch.id, { employeeNo: "ID-1", email: "id1@example.com" });

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ID-STU-0001",
          firstName: "Riya",
          lastName: "Singh",
          dob: new Date("2012-01-01"),
          gender: "F",
          address: "Patna",
        },
      })
    );

    const studentIdCardRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "ID_CARD" });
    expect(studentIdCardRes.status).toBe(201);

    const staffIdCardRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ staffId: staff.id, type: "ID_CARD" });
    expect(staffIdCardRes.status).toBe(201);
    expect(staffIdCardRes.body.data.staffId).toBe(staff.id);
    expect(staffIdCardRes.body.data.studentId).toBeNull();
    // Distinct register numbers — no collision with the student's ID card.
    expect(staffIdCardRes.body.data.number).not.toBe(studentIdCardRes.body.data.number);

    // Neither studentId nor staffId (or both) is rejected.
    const bothRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, staffId: staff.id, type: "ID_CARD" });
    expect(bothRes.status).toBe(400);

    const neitherRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ type: "ID_CARD" });
    expect(neitherRes.status).toBe(400);
  });
});
