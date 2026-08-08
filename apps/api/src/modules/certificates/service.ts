import { getCurrentSessionId, nextCertificateNumber, withTenant } from "@vidyut/db";
import type {
  BulkIdsQueryInput,
  CreateCertificateTemplateInput,
  EsignWebhookInput,
  IssueCertificateInput,
  ListCertificateTemplatesQueryInput,
  ListCertificatesQueryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/**
 * Unit 50 (Open Question 1) — pure token substitution, `{{token}}` ->
 * `data[token]` (empty string if missing). No visual designer, no
 * conditionals/loops — deliberately dumb, exported so tests can verify
 * rendering without a real PDF pipeline.
 */
export function renderCertificateTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => data[token] ?? "");
}

export async function issueCertificate(auth: RequestAuth, input: IssueCertificateInput) {
  // Unit 42 — exactly one of studentId/staffId (Zod-enforced); the same
  // register/numbering machinery issues either, distinguished only by which
  // FK is set.
  const branchId = input.studentId
    ? await (async () => {
        const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: input.studentId } }));
        if (!student || student.deletedAt) {
          throw new AppError("NOT_FOUND", "student.errors.notFound");
        }
        return student.branchId;
      })()
    : await (async () => {
        const staff = await withTenant(auth.tenantId, (tx) => tx.staff.findUnique({ where: { id: input.staffId } }));
        if (!staff || staff.deletedAt) {
          throw new AppError("NOT_FOUND", "staff.errors.notFound");
        }
        return staff.branchId;
      })();
  assertBranchAccess(auth, branchId);

  const certificate = await withTenant(auth.tenantId, async (tx) => {
    const number = await nextCertificateNumber(tx, branchId, input.type);
    return tx.certificate.create({
      data: {
        tenantId: auth.tenantId,
        branchId,
        studentId: input.studentId,
        staffId: input.staffId,
        type: input.type,
        customTitle: input.customTitle,
        templateId: input.templateId,
        number,
        issuedById: auth.userId,
      },
    });
  });

  await enqueue("certificate.generate", { certificateId: certificate.id });

  return certificate;
}

export async function listCertificates(auth: RequestAuth, query: ListCertificatesQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.certificate.findMany({
      where: {
        branchId: query.branchId,
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.staffId ? { staffId: query.staffId } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { issuedAt: "desc" },
    })
  );
}

// --- Unit 50: Certificates Depth ---

export async function createCertificateTemplate(auth: RequestAuth, input: CreateCertificateTemplateInput) {
  if (input.branchId) {
    assertBranchAccess(auth, input.branchId);
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.certificateTemplate.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        type: input.type,
        name: input.name,
        body: input.body,
      },
    })
  );
}

export async function listCertificateTemplates(auth: RequestAuth, query: ListCertificateTemplatesQueryInput) {
  if (query.branchId) {
    assertBranchAccess(auth, query.branchId);
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.certificateTemplate.findMany({
      where: {
        deletedAt: null,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { name: "asc" },
    })
  );
}

/**
 * Scope item 2 — one Certificate(ID_CARD) per enrolled student in the
 * section's current session, batched. QR data (`studentId`+`admissionNo`) is
 * passed through the same stub `certificate.generate` job every other
 * Certificate uses — no real PDF/QR image renders yet (Unit 21's Open
 * Question 3, still unresolved).
 */
export async function generateBulkIds(auth: RequestAuth, query: BulkIdsQueryInput) {
  const section = await withTenant(auth.tenantId, (tx) => tx.section.findUnique({ where: { id: query.sectionId } }));
  if (!section || section.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
  }
  assertBranchAccess(auth, section.branchId);

  const certificates = await withTenant(auth.tenantId, async (tx) => {
    const sessionId = await getCurrentSessionId(tx, section.branchId);
    const enrollments = await tx.enrollment.findMany({
      where: { sectionId: query.sectionId, sessionId, status: "ACTIVE" },
      include: { student: true },
    });

    const created = [];
    for (const enrollment of enrollments) {
      const number = await nextCertificateNumber(tx, section.branchId, "ID_CARD");
      const certificate = await tx.certificate.create({
        data: {
          tenantId: auth.tenantId,
          branchId: section.branchId,
          studentId: enrollment.studentId,
          type: "ID_CARD",
          templateId: query.templateId,
          number,
          issuedById: auth.userId,
        },
      });
      created.push({ certificate, admissionNo: enrollment.student.admissionNo });
    }
    return created;
  });

  await Promise.all(
    certificates.map(({ certificate, admissionNo }) =>
      enqueue("certificate.generate", {
        certificateId: certificate.id,
        qrData: JSON.stringify({ studentId: certificate.studentId, admissionNo }),
      })
    )
  );

  return certificates.map(({ certificate }) => certificate);
}

async function getCertificateOrThrow(auth: RequestAuth, id: string) {
  const certificate = await withTenant(auth.tenantId, (tx) => tx.certificate.findUnique({ where: { id } }));
  if (!certificate) {
    throw new AppError("NOT_FOUND", "certificate.errors.notFound");
  }
  return certificate;
}

/** Open Question 2 — enqueues the gated-stub provider job; the certificate stays REQUESTED until a real webhook (or nothing, honestly, without real credentials) resolves it. */
export async function requestSignature(auth: RequestAuth, id: string) {
  const certificate = await getCertificateOrThrow(auth, id);
  assertBranchAccess(auth, certificate.branchId);

  if (certificate.signatureStatus === "SIGNED") {
    throw new AppError("CONFLICT", "certificate.errors.alreadySigned");
  }

  const updated = await withTenant(auth.tenantId, (tx) =>
    tx.certificate.update({
      where: { id },
      data: { signatureStatus: "REQUESTED", signatureRequestedAt: new Date() },
    })
  );

  await enqueue("certificate.esign-request", { certificateId: id });

  return updated;
}

/**
 * Unauthenticated by design — this is the provider calling us, not a
 * logged-in user (shared-secret checked at the route layer). Same as Unit
 * 13's Razorpay webhook, `tenantId` must travel in the payload itself since
 * there's no JWT to derive it from.
 */
export async function handleEsignWebhook(input: EsignWebhookInput) {
  await withTenant(input.tenantId, async (tx) => {
    const certificate = await tx.certificate.findUnique({ where: { id: input.certificateId } });
    if (!certificate || certificate.tenantId !== input.tenantId) {
      throw new AppError("NOT_FOUND", "certificate.errors.notFound");
    }

    await tx.certificate.update({
      where: { id: input.certificateId },
      data: { signatureStatus: "SIGNED", signedAt: new Date(), signedPdfUrl: input.signedPdfUrl },
    });
  });
}
