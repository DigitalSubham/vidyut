import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { renderCertificateTemplate } from "../src/modules/certificates/service";
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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function setupSection(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `2025-26 ${code}`,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
      },
    })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  return { branch, cls, session, section };
}

async function enrollStudent(
  tenantId: string,
  branchId: string,
  classId: string,
  sectionId: string,
  sessionId: string,
  tag: string
) {
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId,
        admissionNo: `ADM-${tag}`,
        firstName: tag,
        lastName: "Student",
        dob: new Date("2015-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.enrollment.create({ data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId } })
  );
  return student;
}

describe("certificate template rendering (pure, no PDF pipeline)", () => {
  it("substitutes known tokens and blanks unknown ones", () => {
    const rendered = renderCertificateTemplate("Dear {{studentName}}, class {{className}}, {{unknownToken}}.", {
      studentName: "Aarav Kumar",
      className: "5-A",
    });
    expect(rendered).toBe("Dear Aarav Kumar, class 5-A, .");
  });
});

describe("certificate templates, bulk IDs, e-sign, documents", () => {
  it("creates a template and issues a certificate referencing it", async () => {
    const tenant = await createTenant("certs-tpl-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-T1",
          firstName: "T1",
          lastName: "Student",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    const tplRes = await request(app)
      .post("/api/v1/certificates/templates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ type: "BONAFIDE", name: "Standard Bonafide", body: "This certifies {{studentName}} is enrolled." });
    expect(tplRes.status).toBe(201);

    const listRes = await request(app)
      .get("/api/v1/certificates/templates")
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const issueRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "BONAFIDE", templateId: tplRes.body.data.id });
    expect(issueRes.status).toBe(201);
    expect(issueRes.body.data.templateId).toBe(tplRes.body.data.id);
  });

  it("bulk-generates one ID_CARD certificate per enrolled student in a section", async () => {
    const tenant = await createTenant("certs-bulk-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setupSection(tenant.id, "B");
    await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S2");

    const res = await request(app)
      .post(`/api/v1/certificates/bulk-ids?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((c: { type: string }) => c.type === "ID_CARD")).toBe(true);

    const numbers = res.body.data.map((c: { number: string }) => c.number).sort();
    expect(numbers).toEqual(["ID_CARD-000001", "ID_CARD-000002"]);
  });

  it("RBAC: TEACHER cannot bulk-generate IDs", async () => {
    const tenant = await createTenant("certs-bulk-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const { branch, section } = await setupSection(tenant.id, "C");
    const teacher = await teacherToken(tenant.id, branch.id);

    const res = await request(app)
      .post(`/api/v1/certificates/bulk-ids?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(res.status).toBe(403);
  });

  it("e-sign: request-signature enqueues the gated-stub job and marks REQUESTED; webhook (with correct secret) marks SIGNED", async () => {
    const tenant = await createTenant("certs-esign-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-E1",
          firstName: "E1",
          lastName: "Student",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    const issueRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "TC" });
    const certificateId = issueRes.body.data.id;

    const reqRes = await request(app)
      .post(`/api/v1/certificates/${certificateId}/request-signature`)
      .set("Authorization", `Bearer ${owner}`);
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.data.signatureStatus).toBe("REQUESTED");

    // No ESIGN_WEBHOOK_SECRET configured in test env — webhook must reject.
    const badWebhook = await request(app)
      .post("/api/v1/webhooks/esign")
      .send({ tenantId: tenant.id, certificateId, status: "SIGNED", signedPdfUrl: "https://example.test/signed.pdf" });
    expect(badWebhook.status).toBe(403);

    process.env.ESIGN_WEBHOOK_SECRET = "test-secret";
    try {
      const goodWebhook = await request(app)
        .post("/api/v1/webhooks/esign")
        .set("x-esign-webhook-secret", "test-secret")
        .send({ tenantId: tenant.id, certificateId, status: "SIGNED", signedPdfUrl: "https://example.test/signed.pdf" });
      expect(goodWebhook.status).toBe(204);

      const updated = await withTenant(tenant.id, (tx) => tx.certificate.findUniqueOrThrow({ where: { id: certificateId } }));
      expect(updated.signatureStatus).toBe("SIGNED");
      expect(updated.signedPdfUrl).toBe("https://example.test/signed.pdf");
    } finally {
      delete process.env.ESIGN_WEBHOOK_SECRET;
    }
  });

  it("documents: upload-request creates a tagged Document scoped to owner+branch, retrievable via list+tag filter", async () => {
    const tenant = await createTenant("docs-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-D1",
          firstName: "D1",
          lastName: "Student",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    const uploadRes = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        ownerType: "STUDENT",
        ownerId: student.id,
        label: "Birth Certificate",
        fileName: "birth-cert.pdf",
        contentType: "application/pdf",
        tags: ["identity"],
      });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.document.tags).toEqual(["identity"]);
    expect(typeof uploadRes.body.data.uploadUrl).toBe("string");

    const listRes = await request(app)
      .get(`/api/v1/documents?branchId=${branch.id}&tag=identity`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].label).toBe("Birth Certificate");

    const wrongTagRes = await request(app)
      .get(`/api/v1/documents?branchId=${branch.id}&tag=nonexistent`)
      .set("Authorization", `Bearer ${owner}`);
    expect(wrongTagRes.body.data).toHaveLength(0);
  });

  it("documents: rejects an owner from a different branch", async () => {
    const tenant = await createTenant("docs-branch-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const studentB = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branchB.id,
          admissionNo: "ADM-D2",
          firstName: "D2",
          lastName: "Student",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branchA.id,
        ownerType: "STUDENT",
        ownerId: studentB.id,
        label: "Wrong Branch",
        fileName: "x.pdf",
      });
    expect(res.status).toBe(400);
  });
});
