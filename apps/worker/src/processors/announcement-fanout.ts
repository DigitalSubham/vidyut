import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { AnnouncementFanoutPayload } from "@vidyut/types";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);

interface Audience {
  roles?: string[];
  classIds?: string[];
}

/**
 * Resolves the targeted users for an Announcement and writes one
 * NotificationLog per user (context/feature-specs/20's Open Question 1/3).
 * An empty/missing `audience` means "every staff member in the branch" —
 * this job only fans out to matched roles/classes, staff already see every
 * announcement via GET /announcements regardless of audience.
 *
 * Unit 32's PUSH-then-SMS-fallback: role-matched staff always have a User
 * account, so they stay PUSH-only. classId-matched guardians without a
 * linked User (Guardian.userId unset) were previously silently skipped —
 * a real gap, since a phone-only guardian never got announcements at all.
 * Fixed to fall back to SMS via the same SmsWallet-gated path Unit 14/32
 * already use, rather than duplicating the wallet-check logic.
 */
export async function processAnnouncementFanout(job: Job<AnnouncementFanoutPayload>) {
  const { tenantId, branchId, announcementId } = job.data;

  return withTenant(tenantId, async (tx) => {
    const announcement = await tx.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) {
      return { notified: 0 };
    }

    const audience = (announcement.audience as Audience | null) ?? {};
    const pushUserIds = new Set<string>();
    const smsOnlyPhones = new Set<string>();

    if (audience.roles?.length) {
      const userRoles = await tx.userRole.findMany({
        where: { branchId, role: { key: { in: audience.roles as never[] } } },
        select: { userId: true },
      });
      for (const ur of userRoles) pushUserIds.add(ur.userId);
    }

    if (audience.classIds?.length) {
      const enrollments = await tx.enrollment.findMany({
        where: { classId: { in: audience.classIds } },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);
      const guardianLinks = await tx.studentGuardian.findMany({
        where: { studentId: { in: studentIds } },
        include: { guardian: true },
      });
      for (const link of guardianLinks) {
        if (link.guardian.userId) {
          pushUserIds.add(link.guardian.userId);
        } else if (link.guardian.phone) {
          smsOnlyPhones.add(link.guardian.phone);
        }
      }
    }

    for (const userId of pushUserIds) {
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "PUSH",
          templateKey: "announcement.published",
          toUserId: userId,
          status: "SENT",
          payload: { announcementId },
          sentAt: new Date(),
        },
      });
    }

    let smsSent = 0;
    let smsSkipped = 0;
    for (const phone of smsOnlyPhones) {
      const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });
      if ((wallet?.balancePaise ?? 0) < SMS_COST_PAISE) {
        await tx.notificationLog.create({
          data: {
            tenantId,
            branchId,
            channel: "SMS",
            templateKey: "announcement.published",
            toPhone: phone,
            status: "FAILED",
            payload: { announcementId, reason: "insufficient_wallet_balance" },
          },
        });
        smsSkipped += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: SMS_COST_PAISE } } }),
        prisma.walletTxn.create({
          data: { tenantId, type: "DEBIT", amount: SMS_COST_PAISE, reason: "announcement.published", referenceId: announcementId },
        }),
      ]);
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "SMS",
          templateKey: "announcement.published",
          toPhone: phone,
          status: "SENT",
          payload: { announcementId },
          sentAt: new Date(),
        },
      });
      smsSent += 1;
    }

    return { notified: pushUserIds.size + smsSent, pushSent: pushUserIds.size, smsSent, smsSkipped };
  });
}
