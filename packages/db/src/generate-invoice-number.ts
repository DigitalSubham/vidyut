import type { Prisma } from "@prisma/client";

/**
 * Sequential, zero-padded invoice/receipt numbers per branch — same scheme
 * and same concurrency ceiling as generate-admission-no.ts (Unit 07): counts
 * existing rows + 1, so numbers are never reused even after deletes.
 *
 * ponytail: two concurrent generations in the same branch can race on the
 * @@unique([branchId, number]) constraint — caller must run this inside the
 * same withTenant() transaction as the create and retry on a unique-
 * constraint error. Same upgrade path as Unit 07's admissionNo if this
 * becomes a real contention point.
 */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, branchId: string): Promise<string> {
  const count = await tx.invoice.count({ where: { branchId } });
  return `INV-${String(count + 1).padStart(6, "0")}`;
}

export async function nextReceiptNumber(tx: Prisma.TransactionClient, branchId: string): Promise<string> {
  const count = await tx.receipt.count({ where: { branchId } });
  return `RCPT-${String(count + 1).padStart(6, "0")}`;
}
