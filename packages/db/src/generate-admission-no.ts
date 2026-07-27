import type { Prisma } from "@prisma/client";

/**
 * Sequential, zero-padded admissionNo per branch (context/feature-specs/07's
 * Decisions — no configurable prefix/format yet). Counts existing students
 * (incl. soft-deleted, so numbers are never reused) + 1.
 *
 * ponytail: two concurrent creates in the same branch can both read the same
 * count and collide on the @@unique([branchId, admissionNo]) constraint —
 * caller must run this inside the same withTenant() transaction as the
 * `student.create` and retry the whole transaction on a unique-constraint
 * error. Upgrade path if this becomes a real contention point: a per-branch
 * counter row with `SELECT ... FOR UPDATE`.
 */
export async function nextAdmissionNo(tx: Prisma.TransactionClient, branchId: string): Promise<string> {
  const count = await tx.student.count({ where: { branchId } });
  return String(count + 1).padStart(4, "0");
}
