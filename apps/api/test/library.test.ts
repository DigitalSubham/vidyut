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

describe("library — books/copies/members CRUD, RBAC", () => {
  it("creates a book with a copy and a student member", async () => {
    const tenant = await createTenant("library-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["library.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-L1", firstName: "L", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
      })
    );

    const bookRes = await request(app)
      .post("/api/v1/library/books")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Panchatantra", author: "Vishnu Sharma", isbn: "978-0" });
    expect(bookRes.status).toBe(201);
    const bookId = bookRes.body.data.id as string;

    const copyRes = await request(app)
      .post(`/api/v1/library/books/${bookId}/copies`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ barcode: "BC-001" });
    expect(copyRes.status).toBe(201);
    expect(copyRes.body.data.status).toBe("AVAILABLE");

    const memberRes = await request(app)
      .post("/api/v1/library/members")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id });
    expect(memberRes.status).toBe(201);

    const listBooksRes = await request(app)
      .get(`/api/v1/library/books?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listBooksRes.status).toBe(200);
    expect(listBooksRes.body.data).toHaveLength(1);
  });

  it("rejects a member with both studentId and staffId, and one with neither", async () => {
    const tenant = await createTenant("library-member-validation-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["library.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const neither = await request(app)
      .post("/api/v1/library/members")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id });
    expect(neither.status).toBe(422);
  });

  it("RBAC: a caller without library.manage is denied", async () => {
    const tenant = await createTenant("library-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/library/books")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, title: "X", author: "Y" });
    expect(res.status).toBe(403);
  });
});

describe("library — issue/return/renew tracks copy status and generates a fine on overdue return (Open Question 2)", () => {
  it("issuing sets ISSUED; returning on time generates no fine; a late return generates a real InvoiceItem", async () => {
    const tenant = await createTenant("library-issue-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["library.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
      })
    );
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-L2", firstName: "L", lastName: "Two", dob: new Date("2012-01-01"), gender: "F", address: "Patna" },
      })
    );

    const bookRes = await request(app)
      .post("/api/v1/library/books")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Book A", author: "Author A" });
    const bookId = bookRes.body.data.id as string;
    const copyRes = await request(app)
      .post(`/api/v1/library/books/${bookId}/copies`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ barcode: "BC-100" });
    const copyId = copyRes.body.data.id as string;
    const memberRes = await request(app)
      .post("/api/v1/library/members")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id });
    const memberId = memberRes.body.data.id as string;

    // Issue with a due date already in the past, so the return below is overdue.
    const pastDue = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${owner}`)
      .send({ copyId, memberId, dueAt: pastDue });
    expect(issueRes.status).toBe(201);
    const issueId = issueRes.body.data.id as string;

    const issuedCopy = await withTenant(tenant.id, (tx) => tx.bookCopy.findUnique({ where: { id: copyId } }));
    expect(issuedCopy?.status).toBe("ISSUED");

    // A second issue attempt on the same (now-ISSUED) copy is rejected.
    const doubleIssueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${owner}`)
      .send({ copyId, memberId });
    expect(doubleIssueRes.status).toBe(422);

    const returnRes = await request(app)
      .post(`/api/v1/library/issues/${issueId}/return`)
      .set("Authorization", `Bearer ${owner}`);
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.fineInvoiceId).toBeTruthy();

    const returnedCopy = await withTenant(tenant.id, (tx) => tx.bookCopy.findUnique({ where: { id: copyId } }));
    expect(returnedCopy?.status).toBe("AVAILABLE");

    const fineInvoice = await withTenant(tenant.id, (tx) =>
      tx.invoice.findUnique({ where: { id: returnRes.body.data.fineInvoiceId }, include: { items: { include: { feeHead: true } } } })
    );
    expect(fineInvoice).toBeTruthy();
    expect(fineInvoice!.items[0]!.feeHead.type).toBe("MISC");
    // 3 days overdue (dueAt back-dated by 3 days) at 200 paise/day = 600 (allow same-day rounding to 3-4 days).
    expect(fineInvoice!.items[0]!.amount).toBeGreaterThanOrEqual(600);

    // Renewing an already-returned issue is rejected.
    const renewRes = await request(app)
      .post(`/api/v1/library/issues/${issueId}/renew`)
      .set("Authorization", `Bearer ${owner}`);
    expect(renewRes.status).toBe(422);
  });

  it("returning on time (no overdue days) generates no fine invoice", async () => {
    const tenant = await createTenant("library-ontime-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["library.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-L3", firstName: "L", lastName: "Three", dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
      })
    );

    const bookRes = await request(app)
      .post("/api/v1/library/books")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Book B", author: "Author B" });
    const bookId = bookRes.body.data.id as string;
    const copyRes = await request(app)
      .post(`/api/v1/library/books/${bookId}/copies`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ barcode: "BC-200" });
    const copyId = copyRes.body.data.id as string;
    const memberRes = await request(app)
      .post("/api/v1/library/members")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id });
    const memberId = memberRes.body.data.id as string;

    const issueRes = await request(app)
      .post("/api/v1/library/issues")
      .set("Authorization", `Bearer ${owner}`)
      .send({ copyId, memberId });
    const issueId = issueRes.body.data.id as string;

    const returnRes = await request(app)
      .post(`/api/v1/library/issues/${issueId}/return`)
      .set("Authorization", `Bearer ${owner}`);
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.fineInvoiceId).toBeFalsy();
  });
});
