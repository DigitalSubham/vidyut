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

describe("Unit 43 — Academic Structure Depth (elective baskets, houses)", () => {
  it("elective baskets: a student can pick one option from a defined basket, visible on their profile", async () => {
    const tenant = await createTenant("elective-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["class.manage", "subject.manage"]);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const classRes = await request(app)
      .post("/api/v1/academic/classes")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Class 11 Science", order: 11 });
    expect(classRes.status).toBe(201);
    const classId = classRes.body.data.id;

    const bio = await request(app)
      .post("/api/v1/academic/subjects")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Biology", code: "BIO", type: "ELECTIVE" });
    const cs = await request(app)
      .post("/api/v1/academic/subjects")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Computer Science", code: "CS", type: "ELECTIVE" });

    const bioClassSubject = await request(app)
      .post(`/api/v1/academic/classes/${classId}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ subjectId: bio.body.data.id, isElective: true });
    const csClassSubject = await request(app)
      .post(`/api/v1/academic/classes/${classId}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ subjectId: cs.body.data.id, isElective: true });

    const groupRes = await request(app)
      .post("/api/v1/academic/elective-groups")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, classId, name: "Elective Basket A" });
    expect(groupRes.status).toBe(201);
    const groupId = groupRes.body.data.id;

    await request(app)
      .post(`/api/v1/academic/elective-groups/${groupId}/options`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classSubjectId: bioClassSubject.body.data.id });
    await request(app)
      .post(`/api/v1/academic/elective-groups/${groupId}/options`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classSubjectId: csClassSubject.body.data.id });

    const listRes = await request(app)
      .get("/api/v1/academic/elective-groups")
      .query({ classId })
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data[0].options).toHaveLength(2);

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ELEC-0001",
          firstName: "Aditi",
          lastName: "Kumari",
          dob: new Date("2009-01-01"),
          gender: "F",
          address: "Patna",
        },
      })
    );

    const chooseRes = await request(app)
      .post(`/api/v1/academic/elective-groups/${groupId}/choice`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, classSubjectId: csClassSubject.body.data.id });
    expect(chooseRes.status).toBe(200);
    expect(chooseRes.body.data.classSubjectId).toBe(csClassSubject.body.data.id);

    // Re-picking upserts, doesn't create a second choice for the same group.
    const rePick = await request(app)
      .post(`/api/v1/academic/elective-groups/${groupId}/choice`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, classSubjectId: bioClassSubject.body.data.id });
    expect(rePick.status).toBe(200);

    const choices = await withTenant(tenant.id, (tx) =>
      tx.studentElectiveChoice.findMany({ where: { studentId: student.id } })
    );
    expect(choices).toHaveLength(1);
    expect(choices[0]?.classSubjectId).toBe(bioClassSubject.body.data.id);

    // An option that doesn't belong to the group is rejected.
    const otherSubject = await request(app)
      .post("/api/v1/academic/subjects")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "History", code: "HIST" });
    const otherClassSubject = await request(app)
      .post(`/api/v1/academic/classes/${classId}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ subjectId: otherSubject.body.data.id });
    const invalidChoice = await request(app)
      .post(`/api/v1/academic/elective-groups/${groupId}/choice`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, classSubjectId: otherClassSubject.body.data.id });
    expect(invalidChoice.status).toBe(400);
  });

  it("houses: a student can be tagged with a house, and the house roster lists its members", async () => {
    const tenant = await createTenant("house-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["class.manage", "student.edit"]);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const houseRes = await request(app)
      .post("/api/v1/academic/houses")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Red House", color: "#ff0000" });
    expect(houseRes.status).toBe(201);
    const houseId = houseRes.body.data.id;

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "HOUSE-0001",
          firstName: "Rohan",
          lastName: "Das",
          dob: new Date("2010-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    const patchRes = await request(app)
      .patch(`/api/v1/students/${student.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ houseId });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.houseId).toBe(houseId);

    const rosterRes = await request(app)
      .get(`/api/v1/academic/houses/${houseId}/roster`)
      .set("Authorization", `Bearer ${owner}`);
    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data).toHaveLength(1);
    expect(rosterRes.body.data[0].id).toBe(student.id);

    const listHousesRes = await request(app)
      .get("/api/v1/academic/houses")
      .query({ branchId: branch.id })
      .set("Authorization", `Bearer ${owner}`);
    expect(listHousesRes.status).toBe(200);
    expect(listHousesRes.body.data).toHaveLength(1);
  });

  it("tenant-isolation: houses/elective-groups in one tenant are invisible to another", async () => {
    const tenantA = await createTenant("structure-iso-a");
    const tenantB = await createTenant("structure-iso-b");
    tenantIds.push(tenantA.id, tenantB.id);
    await createRoleWithPermissions(tenantA.id, "OWNER", ["class.manage"]);
    await createRoleWithPermissions(tenantB.id, "OWNER", ["class.manage"]);
    const branchA = await createBranch(tenantA.id, "MAIN");
    const branchB = await createBranch(tenantB.id, "MAIN");
    const ownerA = await ownerToken(tenantA.id, [branchA.id]);
    const ownerB = await ownerToken(tenantB.id, [branchB.id]);

    await request(app)
      .post("/api/v1/academic/houses")
      .set("Authorization", `Bearer ${ownerA}`)
      .send({ branchId: branchA.id, name: "Blue House" });
    await request(app)
      .post("/api/v1/academic/houses")
      .set("Authorization", `Bearer ${ownerB}`)
      .send({ branchId: branchB.id, name: "Green House" });

    const listA = await request(app)
      .get("/api/v1/academic/houses")
      .query({ branchId: branchA.id })
      .set("Authorization", `Bearer ${ownerA}`);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].name).toBe("Blue House");
  });
});
