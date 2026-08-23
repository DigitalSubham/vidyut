import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { AnnouncementFanoutPayload } from "@vidyut/types";
import { sendPush } from "../providers/push";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";
import { isOptedIn } from "../comm-preference";

const SMS_COST_PAISE = Number(process.env.SMS_COST_PAISE ?? 20);
const PUSH_TITLE = "Announcement";

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
 * Unit 32's PUSH-then-SMS-fallback, hardened in Unit 40: a `pushToken`
 * (new this unit) is required for a real PUSH attempt, not just a linked
 * User — role-matched staff with no registered device get a real (failed)
 * push attempt logged, no SMS fallback (matches existing behavior, staff
 * aren't guaranteed a guardian-style phone number). classId-matched
 * guardians without a linked User/pushToken fall back to SMS via the same
 * SmsWallet-gated path Unit 14/32 already use.
 */
export async function processAnnouncementFanout(job: Job<AnnouncementFanoutPayload>) {
  const { tenantId, branchId, announcementId } = job.data;
  const templateKey = job.data.templateKey ?? "announcement.published";

  return withTenant(tenantId, async (tx) => {
    const announcement = await tx.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) {
      return { notified: 0 };
    }

    const message = await resolveTemplateBody(
      tx,
      tenantId,
      templateKey,
      "SMS",
      announcement.title,
      { announcementId }
    );

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

    let pushSent = 0;
    for (const userId of pushUserIds) {
      // Unit 68 — a real opt-out gate: absence of a preference row means opted in.
      if (!(await isOptedIn(tx, userId, "PUSH"))) {
        continue;
      }
      const user = await tx.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
      const pushResult = await sendPush(user?.pushToken ?? null, PUSH_TITLE, message);
      await tx.notificationLog.create({
        data: {
          tenantId,
          branchId,
          channel: "PUSH",
          templateKey,
          toUserId: userId,
          status: pushResult.sent || pushResult.stubbed ? "SENT" : "FAILED",
          payload: { announcementId, ...(pushResult.error ? { error: pushResult.error } : {}) },
          sentAt: pushResult.sent || pushResult.stubbed ? new Date() : undefined,
        },
      });
      if (pushResult.sent || pushResult.stubbed) pushSent += 1;
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
            templateKey,
            toPhone: phone,
            status: "FAILED",
            payload: { announcementId, reason: "insufficient_wallet_balance" },
          },
        });
        smsSkipped += 1;
        continue;
      }

      const smsResult = await sendSms(phone, message);

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
          templateKey,
          toPhone: phone,
          status: smsResult.sent || smsResult.stubbed ? "SENT" : "FAILED",
          payload: { announcementId, ...(smsResult.error ? { error: smsResult.error } : {}) },
          sentAt: smsResult.sent || smsResult.stubbed ? new Date() : undefined,
        },
      });
      smsSent += 1;
    }

    return { notified: pushSent + smsSent, pushSent, smsSent, smsSkipped };
  });
}
