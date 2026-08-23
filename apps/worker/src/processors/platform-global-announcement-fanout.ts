import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { PlanKey, PlatformGlobalAnnouncementFanoutPayload } from "@vidyut/types";
import { enqueue } from "../enqueue";

/**
 * Unit 56 — fans a `GlobalAnnouncement` out into a real per-tenant/branch
 * `Announcement` row (Unit 20's existing model), then reuses the existing
 * `announcement.fanout` job unchanged for actual per-user dispatch — no new
 * dispatch logic invented here, just Announcement creation at scale.
 */
export async function processPlatformGlobalAnnouncementFanout(job: Job<PlatformGlobalAnnouncementFanoutPayload>) {
  const announcement = await prisma.globalAnnouncement.findUnique({ where: { id: job.data.globalAnnouncementId } });
  if (!announcement) {
    return { created: 0, note: "GlobalAnnouncement not found (deleted before fanout ran)" };
  }

  const targetPlanKeys = announcement.targetPlanKeys as PlanKey[] | null;

  const tenants = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      ...(targetPlanKeys && targetPlanKeys.length > 0 ? { plan: { key: { in: targetPlanKeys } } } : {}),
    },
    select: { id: true },
  });

  let created = 0;
  for (const tenant of tenants) {
    const branches = await withTenant(tenant.id, (tx) => tx.branch.findMany({ where: { isActive: true } }));
    for (const branch of branches) {
      const created_ = await withTenant(tenant.id, (tx) =>
        tx.announcement.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            title: announcement.title,
            body: announcement.body,
            createdById: announcement.createdById,
          },
        })
      );
      await enqueue("announcement.fanout", {
        tenantId: tenant.id,
        branchId: branch.id,
        announcementId: created_.id,
      });
      created += 1;
    }
  }

  return { created };
}
