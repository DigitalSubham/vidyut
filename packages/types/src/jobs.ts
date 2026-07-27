/** Shared between apps/api (producer) and apps/worker (consumer) — context/code-standards.md. */
export const QUEUE_NAME = "vidyut-jobs";

export const JOB_NAMES = [
  "demo.ping",
  "appbuild.generate",
  "students.import",
  "guardian.invite",
  "receipt.generate",
  "fees.reminderScan",
  "fees.reminderSend",
  "students.absenceAlert",
  "reportcard.generate",
  "announcement.fanout",
  "certificate.generate",
] as const;
export type JobName = (typeof JOB_NAMES)[number];

export interface DemoPingPayload {
  message: string;
}

/**
 * Unit 31 — real EAS Build/Submit call when EAS_ROBOT_ACCESS_TOKEN/
 * EAS_PROJECT_ID are configured; otherwise fails the AppBuild clearly rather
 * than faking success (no real Apple/Google dev account exists yet per
 * context/prerequisites.md).
 */
export interface AppBuildGeneratePayload {
  tenantId: string;
  appBuildId: string;
}

/** context/feature-specs/07-students-bulk-import.md — parses fileKey (.xlsx/.csv) from object storage. */
export interface StudentsImportPayload {
  tenantId: string;
  branchId: string;
  fileKey: string;
}

export interface StudentsImportRowResult {
  row: number;
  status: "success" | "error";
  studentId?: string;
  error?: string;
}

export interface StudentsImportResult {
  total: number;
  succeeded: number;
  failed: number;
  rows: StudentsImportRowResult[];
}

/** context/feature-specs/08-parents-guardians.md — the SMS "send" step for a guardian invite/OTP. */
export interface GuardianInvitePayload {
  phone: string;
  code: string;
}

/**
 * context/feature-specs/12-fee-collection-ledger.md — stubbed (no Puppeteer
 * rendering yet, same pattern as appbuild.stub): proves the enqueue -> worker
 * round trip without producing a real PDF.
 */
export interface ReceiptGeneratePayload {
  receiptId: string;
}

/**
 * context/feature-specs/14-fee-reminders.md — the nightly cron tick (no
 * tenantId = scan every ACTIVE tenant; a manual per-tenant trigger sets it).
 */
export interface FeesReminderScanPayload {
  tenantId?: string;
}

export interface FeesReminderSendPayload {
  tenantId: string;
  branchId: string;
  invoiceId: string;
  guardianId: string;
  phone: string;
}

/** context/feature-specs/16-teacher-mobile-attendance.md — one per (student, day) marked ABSENT. */
export interface StudentsAbsenceAlertPayload {
  tenantId: string;
  branchId: string;
  studentId: string;
  date: string;
}

/**
 * context/feature-specs/19-report-cards.md — stubbed like receipt.generate
 * (no Puppeteer rendering yet): proves the enqueue -> worker round trip
 * without producing a real PDF.
 */
export interface ReportCardGeneratePayload {
  reportCardId: string;
}

/** context/feature-specs/20-notifications-announcements.md — resolves the audience and writes one NotificationLog per targeted user. */
export interface AnnouncementFanoutPayload {
  tenantId: string;
  branchId: string;
  announcementId: string;
}

/** context/feature-specs/21-certificates-ids.md — stubbed like receipt.generate/reportcard.generate (no PDF pipeline yet). */
export interface CertificateGeneratePayload {
  certificateId: string;
}

export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";

export interface JobStatus {
  id: string;
  name: string;
  state: JobState;
  returnValue?: unknown;
  failedReason?: string;
}
