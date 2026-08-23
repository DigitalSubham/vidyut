import type { Prisma } from "@vidyut/db";

/**
 * Unit 68 — a real send-time opt-out gate (Open Question 1). Absence of a
 * `CommunicationPreference` row for (userId, channel) means "opted in," the
 * confirmed default for every channel including birthday automation; an
 * explicit row with `optedIn: false` is how a user turns a channel off.
 */
export async function isOptedIn(
  tx: Prisma.TransactionClient,
  userId: string,
  channel: "PUSH" | "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP"
): Promise<boolean> {
  const pref = await tx.communicationPreference.findUnique({
    where: { userId_channel: { userId, channel } },
  });
  return pref?.optedIn ?? true;
}
