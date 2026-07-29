import { nextCertificateNumber, withTenant } from "@vidyut/db";
import type { IssueCertificateInput, ListCertificatesQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
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
