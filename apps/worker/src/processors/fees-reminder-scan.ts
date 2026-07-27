import type { Job } from "bullmq";
import { prisma, withTenant } from "@vidyut/db";
import type { FeesReminderScanPayload } from "@vidyut/types";
import { enqueue } from "../enqueue";

const REMINDER_TEMPLATE_KEY = "fee.reminder";
const DAYS_BEFORE_DUE = 3;
const REPEAT_DAYS_OVERDUE = 7;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * The nightly cron tick (context/feature-specs/14-fee-reminders.md) — no
 * tenantId scans every ACTIVE tenant with the `fees` module enabled; a
 * tenantId scopes to just that tenant (the manual /fees/reminders/run trigger).
 */
export async function processFeesReminderScan(job: Job<FeesReminderScanPayload>) {
  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + DAYS_BEFORE_DUE * 24 * 60 * 60 * 1000);

  const tenantIds = job.data.tenantId
    ? [job.data.tenantId]
    : (await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((t) => t.id);

  let enqueuedCount = 0;

  for (const tenantId of tenantIds) {
    // Same "missing row = disabled" default as apps/api's core/entitlements.ts.
    const moduleToggle = await prisma.moduleToggle.findUnique({
      where: { tenantId_moduleKey: { tenantId, moduleKey: "fees" } },
    });
    if (!moduleToggle?.enabled) {
      continue;
    }

    await withTenant(tenantId, async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lte: dueSoonCutoff } },
      });

      for (const invoice of invoices) {
        const lastReminder = await tx.notificationLog.findFirst({
          where: {
            templateKey: REMINDER_TEMPLATE_KEY,
            payload: { path: ["invoiceId"], equals: invoice.id },
          },
          orderBy: { createdAt: "desc" },
        });

        const isOverdue = invoice.dueDate.getTime() < now.getTime();
        const eligible = isOverdue
          ? !lastReminder || daysBetween(now, lastReminder.createdAt) >= REPEAT_DAYS_OVERDUE
          : !lastReminder; // the pre-due reminder fires once

        if (!eligible) {
          continue;
        }

        const guardianLinks = await tx.studentGuardian.findMany({
          where: { studentId: invoice.studentId, OR: [{ isPrimary: true }, { canPay: true }] },
          include: { guardian: true },
        });

        for (const link of guardianLinks) {
          if (!link.guardian.phone) continue;
          await enqueue("fees.reminderSend", {
            tenantId,
            branchId: invoice.branchId,
            invoiceId: invoice.id,
            guardianId: link.guardian.id,
            phone: link.guardian.phone,
          });
          enqueuedCount += 1;
        }
      }
    });
  }

  return { tenantsScanned: tenantIds.length, remindersEnqueued: enqueuedCount };
}
