import { withTenant, type Prisma } from "@vidyut/db";
import type { CreateCircularInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createCircular(auth: RequestAuth, input: CreateCircularInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.circular.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        body: input.body,
        attachmentUrl: input.attachmentUrl,
        audience: input.audience as Prisma.InputJsonValue | undefined,
        createdById: auth.userId,
      },
    })
  );
}

/** Reads are open to any authenticated staff role — same precedent as Unit 20's announcements. */
export async function listCircularsForBranch(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.circular.findMany({ where: { branchId }, orderBy: { publishedAt: "desc" } })
  );
}

async function getCircularOrThrow(auth: RequestAuth, id: string) {
  const circular = await withTenant(auth.tenantId, (tx) => tx.circular.findUnique({ where: { id } }));
  if (!circular) {
    throw new AppError("NOT_FOUND", "engagement.errors.circularNotFound");
  }
  return circular;
}

/** No branch/permission gate — acking is "I saw this", open to whoever is authenticated (staff or self-scoped alike). */
export async function ackCircular(auth: RequestAuth, id: string) {
  await getCircularOrThrow(auth, id);

  return withTenant(auth.tenantId, (tx) =>
    tx.circularAck.upsert({
      where: { circularId_userId: { circularId: id, userId: auth.userId } },
      create: { tenantId: auth.tenantId, circularId: id, userId: auth.userId },
      update: {},
    })
  );
}

export async function listCircularAcks(auth: RequestAuth, id: string) {
  const circular = await getCircularOrThrow(auth, id);
  assertBranchAccess(auth, circular.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.circularAck.findMany({ where: { circularId: id }, orderBy: { ackedAt: "asc" } })
  );
}
