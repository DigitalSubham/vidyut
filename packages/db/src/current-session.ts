import type { Prisma } from "@prisma/client";

/** The branch's current AcademicSession id, or null if none is set as current. */
export async function getCurrentSessionId(
  tx: Prisma.TransactionClient,
  branchId: string
): Promise<string | null> {
  const session = await tx.academicSession.findFirst({ where: { branchId, isCurrent: true } });
  return session?.id ?? null;
}
