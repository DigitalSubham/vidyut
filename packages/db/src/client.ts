import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __vidyutPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__vidyutPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__vidyutPrisma = prisma;
}
