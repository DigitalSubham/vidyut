import { randomInt } from "node:crypto";
import { prisma } from "./client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids visual ambiguity when read aloud/typed
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return code;
}

/**
 * A short, human-friendly, globally-unique code the mobile app resolves to a
 * tenant (context/feature-specs/15b's Open Questions). Tenant creation is
 * low-frequency, so a random-then-check-uniqueness loop is simpler than a
 * sequential counter (which would need a shared counter across all tenants,
 * not a per-tenant one like nextAdmissionNo/nextInvoiceNumber).
 */
export async function generateSchoolCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode();
    const existing = await prisma.tenant.findUnique({ where: { schoolCode: code } });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Could not generate a unique school code after several attempts");
}
