import { withTenant } from "@vidyut/db";
import type { SendMessageInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

/** Verifies the caller is one of the two conversation participants — either the staff member or the guardian, resolved from their own userId, never trusted from the request. Async, REST-polled chat (Open Question 1) — no websocket infra. */
async function assertParticipant(auth: RequestAuth, staffId: string, guardianId: string): Promise<void> {
  const [staff, guardian] = await withTenant(auth.tenantId, (tx) =>
    Promise.all([tx.staff.findUnique({ where: { id: staffId } }), tx.guardian.findUnique({ where: { id: guardianId } })])
  );
  if (!staff || !guardian) {
    throw new AppError("NOT_FOUND", "engagement.errors.conversationNotFound");
  }
  const isStaffSide = staff.userId === auth.userId;
  const isGuardianSide = guardian.userId === auth.userId;
  if (!isStaffSide && !isGuardianSide) {
    // OWNER/PRINCIPAL/ADMIN with branch access may still read (not send) for
    // moderation purposes — matches the fee-refund-style "staff can see
    // everything in their branch" precedent, not a hole in self-scope.
    if (!branchAccessAllowed(auth, staff.branchId)) {
      throw new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden");
    }
  }
}

export async function sendMessage(auth: RequestAuth, input: SendMessageInput) {
  await assertParticipant(auth, input.staffId, input.guardianId);

  return withTenant(auth.tenantId, (tx) =>
    tx.message.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        staffId: input.staffId,
        guardianId: input.guardianId,
        senderId: auth.userId,
        body: input.body,
      },
    })
  );
}

export async function listThread(auth: RequestAuth, staffId: string, guardianId: string) {
  await assertParticipant(auth, staffId, guardianId);

  return withTenant(auth.tenantId, (tx) =>
    tx.message.findMany({ where: { staffId, guardianId }, orderBy: { createdAt: "asc" } })
  );
}

/** The caller's own conversations (as either the staff or the guardian side), most-recent-message-first. */
export async function listMyThreads(auth: RequestAuth) {
  return withTenant(auth.tenantId, async (tx) => {
    const [staff, guardian] = await Promise.all([
      tx.staff.findUnique({ where: { userId: auth.userId } }),
      tx.guardian.findFirst({ where: { userId: auth.userId } }),
    ]);

    const messages = await tx.message.findMany({
      where: {
        OR: [...(staff ? [{ staffId: staff.id }] : []), ...(guardian ? [{ guardianId: guardian.id }] : [])],
      },
      orderBy: { createdAt: "desc" },
    });

    const threads = new Map<string, (typeof messages)[number]>();
    for (const m of messages) {
      const key = `${m.staffId}:${m.guardianId}`;
      if (!threads.has(key)) {
        threads.set(key, m);
      }
    }
    return [...threads.values()];
  });
}
