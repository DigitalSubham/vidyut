import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { CommBirthdayScanPayload } from "@vidyut/types";
import { sendPush } from "../providers/push";
import { sendSms } from "../providers/sms";
import { resolveTemplateBody } from "../providers/resolve-template";
import { isOptedIn } from "../comm-preference";

const TEMPLATE_KEY = "birthday.greeting";

function isBirthdayToday(dob: Date, today: Date): boolean {
  return dob.getUTCMonth() === today.getUTCMonth() && dob.getUTCDate() === today.getUTCDate();
}

/**
 * Unit 68 scope #4 — the nightly birthday cron (Unit 14/57/64's own scan
 * shape). Student birthdays only: `Staff` has no `dob` field in the
 * existing schema, so staff birthdays are out of scope for this pass (a
 * real spec-vs-schema gap, same category as Unit 66's Enrollment
 * constraint — flagged, not silently dropped). Default is ON (Open
 * Question 2, confirmed with the user): every guardian gets a birthday
 * greeting for their child unless they've explicitly opted out via
 * `CommunicationPreference`. Sends PUSH to a linked User account, falls
 * back to SMS on the guardian's phone when there's no account — the same
 * PUSH-then-SMS-fallback pipeline every other alert in this codebase uses
 * (Unit 32/40).
 */
export async function processCommBirthdayScan(job: Job<CommBirthdayScanPayload>) {
  const today = new Date();
  const tenantIds = job.data.tenantId
    ? [job.data.tenantId]
    : (await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((t) => t.id);

  let sent = 0;

  for (const tenantId of tenantIds) {
    await withTenant(tenantId, async (tx) => {
      const students = await tx.student.findMany({ where: { status: "ACTIVE" }, select: { id: true, branchId: true, dob: true } });
      const birthdayStudents = students.filter((s) => isBirthdayToday(s.dob, today));

      for (const student of birthdayStudents) {
        const guardianLinks = await tx.studentGuardian.findMany({
          where: { studentId: student.id },
          include: { guardian: true },
        });

        const message = await resolveTemplateBody(
          tx,
          tenantId,
          TEMPLATE_KEY,
          "SMS",
          "Happy Birthday to your child from all of us!",
          {}
        );

        for (const link of guardianLinks) {
          if (link.guardian.userId) {
            if (!(await isOptedIn(tx, link.guardian.userId, "PUSH"))) continue;
            const user = await tx.user.findUnique({ where: { id: link.guardian.userId }, select: { pushToken: true } });
            const result = await sendPush(user?.pushToken ?? null, "Happy Birthday!", message);
            await tx.notificationLog.create({
              data: {
                tenantId,
                branchId: student.branchId,
                channel: "PUSH",
                templateKey: TEMPLATE_KEY,
                toUserId: link.guardian.userId,
                status: result.sent || result.stubbed ? "SENT" : "FAILED",
                payload: { studentId: student.id },
                sentAt: result.sent || result.stubbed ? new Date() : undefined,
              },
            });
            if (result.sent || result.stubbed) sent += 1;
          } else if (link.guardian.phone) {
            const result = await sendSms(link.guardian.phone, message);
            await tx.notificationLog.create({
              data: {
                tenantId,
                branchId: student.branchId,
                channel: "SMS",
                templateKey: TEMPLATE_KEY,
                toPhone: link.guardian.phone,
                status: result.sent || result.stubbed ? "SENT" : "FAILED",
                payload: { studentId: student.id },
                sentAt: result.sent || result.stubbed ? new Date() : undefined,
              },
            });
            if (result.sent || result.stubbed) sent += 1;
          }
        }
      }
    });
  }

  return { tenantsScanned: tenantIds.length, birthdaysSent: sent };
}
