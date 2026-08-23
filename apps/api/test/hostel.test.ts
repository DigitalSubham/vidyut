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

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

async function makeStudent(tenantId: string, branchId: string, admissionNo: string) {
  return withTenant(tenantId, (tx) =>
    tx.student.create({
      data: { tenantId, branchId, admissionNo, firstName: "H", lastName: admissionNo, dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
    })
  );
}

describe("hostel — blocks/rooms CRUD, RBAC", () => {
  it("creates a block with a room", async () => {
    const tenant = await createTenant("hostel-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["hostel.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const blockRes = await request(app)
      .post("/api/v1/hostel/blocks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Block A" });
    expect(blockRes.status).toBe(201);
    const blockId = blockRes.body.data.id as string;

    const roomRes = await request(app)
      .post(`/api/v1/hostel/blocks/${blockId}/rooms`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ roomNo: "101", capacity: 2 });
    expect(roomRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/hostel/blocks/${blockId}/rooms?blockId=${blockId}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it("RBAC: a caller without hostel.manage is denied", async () => {
    const tenant = await createTenant("hostel-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/hostel/blocks")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "Block A" });
    expect(res.status).toBe(403);
  });
});

describe("hostel — room allocation enforces capacity and reuses the existing fee engine (scope #3)", () => {
  it("allocating a student creates a real MISC FeeStructureItem + FeeAssignment, and rejects over-capacity", async () => {
    const tenant = await createTenant("hostel-fee-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["hostel.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
      })
    );
    const s1 = await makeStudent(tenant.id, branch.id, "ADM-H1");
    const s2 = await makeStudent(tenant.id, branch.id, "ADM-H2");
    const s3 = await makeStudent(tenant.id, branch.id, "ADM-H3");

    const blockRes = await request(app)
      .post("/api/v1/hostel/blocks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Block Fee" });
    const blockId = blockRes.body.data.id as string;
    const roomRes = await request(app)
      .post(`/api/v1/hostel/blocks/${blockId}/rooms`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ roomNo: "201", capacity: 2 });
    const roomId = roomRes.body.data.id as string;

    const alloc1 = await request(app)
      .post("/api/v1/hostel/allocations")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: s1.id, roomId, fromDate: "2026-01-01", feeAmountPaise: 500000 });
    expect(alloc1.status).toBe(201);
    expect(alloc1.body.data.feeAssignmentId).toBeTruthy();

    const assignment = await withTenant(tenant.id, (tx) =>
      tx.feeAssignment.findUnique({ where: { id: alloc1.body.data.feeAssignmentId }, include: { structure: { include: { items: { include: { feeHead: true } } } } } })
    );
    const hostelItem = assignment!.structure.items.find((i) => i.feeHead.type === "MISC");
    expect(hostelItem?.amount).toBe(500000);

    const alloc2 = await request(app)
      .post("/api/v1/hostel/allocations")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: s2.id, roomId, fromDate: "2026-01-01", feeAmountPaise: 500000 });
    expect(alloc2.status).toBe(201);

    // Room capacity is 2, already full — a third student is rejected.
    const alloc3 = await request(app)
      .post("/api/v1/hostel/allocations")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: s3.id, roomId, fromDate: "2026-01-01", feeAmountPaise: 500000 });
    expect(alloc3.status).toBe(422);

    // Re-allocating an already-resident student updates in place, not duplicates.
    const realloc1 = await request(app)
      .post("/api/v1/hostel/allocations")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: s1.id, roomId, fromDate: "2026-01-02", feeAmountPaise: 500000 });
    expect(realloc1.status).toBe(201);
    const allAllocations = await withTenant(tenant.id, (tx) => tx.roomAllocation.findMany({ where: { roomId } }));
    expect(allAllocations).toHaveLength(2);
  });
});

describe("hostel — night roll-call attendance (its own model, not a tagged AttendanceRecord)", () => {
  it("marks and lists hostel attendance by date, upserting on a repeat mark", async () => {
    const tenant = await createTenant("hostel-attendance-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark", "attendance.view"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await makeStudent(tenant.id, branch.id, "ADM-H4");

    const markRes = await request(app)
      .post("/api/v1/hostel/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, date: "2026-02-01", records: [{ studentId: student.id, status: "PRESENT" }] });
    expect(markRes.status).toBe(200);
    expect(markRes.body.data[0].status).toBe("PRESENT");

    // Re-marking the same student/date upserts, doesn't duplicate.
    const remarkRes = await request(app)
      .post("/api/v1/hostel/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, date: "2026-02-01", records: [{ studentId: student.id, status: "ABSENT" }] });
    expect(remarkRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/v1/hostel/attendance?branchId=${branch.id}&date=2026-02-01`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].status).toBe("ABSENT");
  });
});
