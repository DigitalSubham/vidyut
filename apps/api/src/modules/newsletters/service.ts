import { withTenant } from "@vidyut/db";
import type { CreateNewsletterInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/**
 * Unit 68 scope #3 — reuses Unit 20's Announcement fan-out mechanism (same
 * pattern as Unit 56's platform-wide announcements): creates a real
 * Announcement row targeting every class in the branch, then enqueues the
 * existing `announcement.fanout` job unchanged, just with a distinct
 * `templateKey` ("newsletter.sent") — not a parallel send pipeline.
 */
export async function createAndSendNewsletter(auth: RequestAuth, input: CreateNewsletterInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const newsletter = await tx.newsletter.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, title: input.title, body: input.body },
    });

    const classIds = (await tx.class.findMany({ where: { branchId: input.branchId, deletedAt: null }, select: { id: true } })).map(
      (c) => c.id
    );

    const announcement = await tx.announcement.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        body: input.body,
        audience: { classIds },
        createdById: auth.userId,
      },
    });

    await enqueue("announcement.fanout", {
      tenantId: auth.tenantId,
      branchId: input.branchId,
      announcementId: announcement.id,
      templateKey: "newsletter.sent",
    });

    return tx.newsletter.update({ where: { id: newsletter.id }, data: { sentAt: new Date() } });
  });
}

export async function listNewsletters(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.newsletter.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } })
  );
}
