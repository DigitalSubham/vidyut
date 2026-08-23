import type { Job } from "bullmq";
import { withTenant } from "@vidyut/db";
import type { ReportsScheduledEmailPayload } from "@vidyut/types";
import { sendEmail } from "../providers/email";

// ponytail: always the trailing 30 days regardless of WEEKLY/MONTHLY cadence — a real per-cadence
// window (last 7 vs last 30 days) is the upgrade if a school actually asks for it.
function trailingWindow(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

async function buildReportRows(
  tenantId: string,
  branchId: string,
  reportType: ReportsScheduledEmailPayload["reportType"],
  from: Date,
  to: Date
): Promise<Record<string, unknown>[]> {
  return withTenant(tenantId, async (tx) => {
    switch (reportType) {
      case "attendance": {
        const records = await tx.attendanceRecord.findMany({
          where: { branchId, date: { gte: from, lte: to } },
          include: { student: true },
        });
        const byStudent = new Map<string, { name: string; present: number; total: number }>();
        for (const r of records) {
          const e = byStudent.get(r.studentId) ?? { name: `${r.student.firstName} ${r.student.lastName}`, present: 0, total: 0 };
          e.total += 1;
          if (["PRESENT", "LATE", "HALF_DAY"].includes(r.status)) e.present += 1;
          byStudent.set(r.studentId, e);
        }
        return Array.from(byStudent.values()).map((v) => ({
          name: v.name,
          daysPresent: v.present,
          daysMarked: v.total,
          attendancePercent: v.total > 0 ? Math.round((v.present / v.total) * 10000) / 100 : 0,
        }));
      }
      case "fees": {
        const invoices = await tx.invoice.findMany({
          where: { branchId, createdAt: { gte: from, lte: to } },
          include: { student: true, items: true, payments: { where: { status: "SUCCESS" } } },
        });
        return invoices.map((inv) => {
          const total = inv.items.reduce((s, i) => s + i.amount - i.discount + i.fine, 0);
          const collected = inv.payments.reduce((s, p) => s + p.amount, 0);
          return {
            invoiceNumber: inv.number,
            studentName: `${inv.student.firstName} ${inv.student.lastName}`,
            invoiced: total,
            collected,
            status: inv.status,
          };
        });
      }
      case "exams": {
        const exams = await tx.exam.findMany({
          where: { branchId, createdAt: { gte: from, lte: to } },
          include: { examSubjects: { include: { marksEntries: true } } },
        });
        return exams.map((exam) => {
          let total = 0;
          let percentSum = 0;
          for (const subject of exam.examSubjects) {
            for (const entry of subject.marksEntries) {
              if (entry.isAbsent || entry.marks === null) continue;
              total += 1;
              percentSum += (entry.marks / subject.maxMarks) * 100;
            }
          }
          return { examName: exam.name, totalEntries: total, averagePercent: total > 0 ? Math.round((percentSum / total) * 100) / 100 : 0 };
        });
      }
      case "admissions": {
        const enquiries = await tx.enquiry.findMany({ where: { branchId, createdAt: { gte: from, lte: to } } });
        return enquiries.map((e) => ({ childName: e.childName, guardianName: e.guardianName, stage: e.stage }));
      }
      case "staff": {
        const staff = await tx.staff.findMany({ where: { branchId, deletedAt: null }, include: { user: true } });
        return staff.map((s) => ({ employeeNo: s.employeeNo, name: s.user.name, designation: s.designation }));
      }
    }
  });
}

/** Unit 55 scope #3 — fires on the schedule's cron pattern (weekly/monthly). Emails the CSV as plain text in the body (no MIME attachment support in the shared `sendEmail` helper — the same gated-stub posture as Unit 40's other adapters otherwise). */
export async function processReportsScheduledEmail(job: Job<ReportsScheduledEmailPayload>) {
  const { tenantId, branchId, reportType, recipientEmail } = job.data;
  const { from, to } = trailingWindow();

  const rows = await buildReportRows(tenantId, branchId, reportType, from, to);
  const csv = toCsv(rows);

  const subject = `Vidyut ${reportType} report — ${from.toDateString()} to ${to.toDateString()}`;
  const body = rows.length > 0 ? csv : "No data for this period.";

  return sendEmail(recipientEmail, subject, body);
}
