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
  const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: input.studentId } }));
  if (!student || student.deletedAt) {
    throw new AppError("NOT_FOUND", "student.errors.notFound");
  }
  assertBranchAccess(auth, student.branchId);

  const certificate = await withTenant(auth.tenantId, async (tx) => {
    const number = await nextCertificateNumber(tx, student.branchId, input.type);
    return tx.certificate.create({
      data: {
        tenantId: auth.tenantId,
        branchId: student.branchId,
        studentId: input.studentId,
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
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { issuedAt: "desc" },
    })
  );
}
