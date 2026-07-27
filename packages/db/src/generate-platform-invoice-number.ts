import { prisma } from "./client";

/**
 * Platform-wide sequential invoice numbers (not tenant/branch-scoped, unlike
 * nextInvoiceNumber/nextReceiptNumber) — PlatformInvoice has no branchId,
 * same counting scheme as generate-invoice-number.ts otherwise.
 */
export async function nextPlatformInvoiceNumber(): Promise<string> {
  const count = await prisma.platformInvoice.count();
  return `PINV-${String(count + 1).padStart(6, "0")}`;
}
