import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

/**
 * All tenant-scoped DB access must go through this helper (AGENTS.md invariant #1).
 * It opens a transaction, sets the RLS session variable for that transaction only
 * (`SET LOCAL` via set_config, so it never leaks across pooled connections), then
 * runs the callback against the transaction client. RLS is the safety net; this is
 * the mechanism that arms it per request.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
