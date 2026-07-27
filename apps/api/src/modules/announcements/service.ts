import { Prisma, withTenant } from "@vidyut/db";
import type { CreateAnnouncementInput, ListAnnouncementsQueryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createAnnouncement(auth: RequestAuth, input: CreateAnnouncementInput) {
  assertBranchAccess(auth, input.branchId);

  const announcement = await withTenant(auth.tenantId, (tx) =>
    tx.announcement.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        body: input.body,
        audience: input.audience as Prisma.InputJsonValue | undefined,
        attachmentUrl: input.attachmentUrl,
        createdById: auth.userId,
      },
    })
  );

  await enqueue("announcement.fanout", {
    tenantId: auth.tenantId,
    branchId: input.branchId,
    announcementId: announcement.id,
  });

  return announcement;
}

export async function listAnnouncements(auth: RequestAuth, query: ListAnnouncementsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.announcement.findMany({ where: { branchId: query.branchId }, orderBy: { publishedAt: "desc" } })
  );
}

export async function deleteAnnouncement(auth: RequestAuth, id: string): Promise<void> {
  const announcement = await withTenant(auth.tenantId, (tx) => tx.announcement.findUnique({ where: { id } }));
  if (!announcement) {
    throw new AppError("NOT_FOUND", "announcement.errors.notFound");
  }
  assertBranchAccess(auth, announcement.branchId);

  await withTenant(auth.tenantId, (tx) => tx.announcement.delete({ where: { id } }));
}
