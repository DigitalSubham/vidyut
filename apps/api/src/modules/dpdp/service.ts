import { withTenant } from "@vidyut/db";
import type { RejectDataDeletionRequestInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import type { RequestAuth } from "../../core/guards/types";

/**
 * Unit 39 (DPDP) — OWNER-only review/execute for a self-scoped delete
 * request (created via `POST /me/data-delete-request`). Reuses
 * `settings.manage` (no new permission per this unit's own Open Question 3
 * "reuse, don't invent" posture); `execute` additionally requires the OWNER
 * role specifically, since it's the one destructive action in this pipeline.
 */
export async function listDataDeletionRequests(auth: RequestAuth) {
  return withTenant(auth.tenantId, (tx) =>
    tx.dataDeletionRequest.findMany({ orderBy: { createdAt: "desc" } })
  );
}

async function getRequestOrThrow(auth: RequestAuth, id: string) {
  const request = await withTenant(auth.tenantId, (tx) => tx.dataDeletionRequest.findUnique({ where: { id } }));
  if (!request) {
    throw new AppError("NOT_FOUND", "dpdp.errors.requestNotFound");
  }
  return request;
}

export async function rejectDataDeletionRequest(
  auth: RequestAuth,
  id: string,
  input: RejectDataDeletionRequestInput
) {
  const request = await getRequestOrThrow(auth, id);
  if (request.status !== "PENDING") {
    throw new AppError("CONFLICT", "dpdp.errors.requestNotPending");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.dataDeletionRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: auth.userId,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote,
      },
    })
  );
}

/**
 * Purges only directly-identifying personal fields on the requester's own
 * `User` (and linked `Guardian`, if any) — name/phone/email, never the
 * school's own business records (attendance/marks/fee/payment history),
 * per this unit's own Open Question 3 reasoning: those carry the school's
 * legitimate record-keeping obligations, which the parent's request alone
 * doesn't override.
 */
export async function executeDataDeletionRequest(auth: RequestAuth, id: string) {
  if (!auth.roles.includes("OWNER")) {
    throw new AppError("FORBIDDEN", "dpdp.errors.executeOwnerOnly");
  }

  const request = await getRequestOrThrow(auth, id);
  if (request.status !== "PENDING") {
    throw new AppError("CONFLICT", "dpdp.errors.requestNotPending");
  }

  return withTenant(auth.tenantId, async (tx) => {
    await tx.user.update({
      where: { id: request.requestedById },
      data: { name: "Deleted User", phone: null, email: null, passwordHash: null, status: "INACTIVE" },
    });
    await tx.guardian.updateMany({
      where: { userId: request.requestedById },
      data: { name: "Deleted User", phone: "", email: null, occupation: null },
    });

    return tx.dataDeletionRequest.update({
      where: { id },
      data: {
        status: "EXECUTED",
        reviewedById: request.reviewedById ?? auth.userId,
        reviewedAt: request.reviewedAt ?? new Date(),
        executedById: auth.userId,
        executedAt: new Date(),
      },
    });
  });
}
