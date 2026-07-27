import type { CertificateType, Prisma } from "@prisma/client";

/**
 * Sequential, zero-padded certificate numbers per (branch, type) — a TC
 * register and a bonafide register are numbered independently, matching how
 * real school registers work. Same scheme/concurrency ceiling as
 * generate-invoice-number.ts.
 *
 * ponytail: two concurrent generations in the same (branchId, type) can race
 * on the @@unique([branchId, type, number]) constraint — caller must run
 * this inside the same withTenant() transaction as the create and retry on a
 * unique-constraint error. Same upgrade path as Unit 07's admissionNo if
 * this becomes a real contention point.
 */
export async function nextCertificateNumber(
  tx: Prisma.TransactionClient,
  branchId: string,
  type: CertificateType
): Promise<string> {
  const count = await tx.certificate.count({ where: { branchId, type } });
  return `${type}-${String(count + 1).padStart(6, "0")}`;
}
