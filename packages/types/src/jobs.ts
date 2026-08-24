/** Shared between apps/api (producer) and apps/worker (consumer) — context/code-standards.md. */
export const QUEUE_NAME = "vidyut-jobs";

export const JOB_NAMES = [
  "demo.ping",
  "appbuild.generate",
  "students.import",
  "guardian.invite",
  "staff.invite",
  "receipt.generate",
  "fees.reminderScan",
  "fees.reminderSend",
  "students.absenceAlert",
  "reportcard.generate",
  "announcement.fanout",
  "certificate.generate",
  "certificate.esign-request",
  "reports.scheduledEmail",
  "platform.globalAnnouncementFanout",
  "transport.geofenceAlert",
  "transport.expiryScan",
  "transport.expiryAlert",
  "frontoffice.gatePassAlert",
  "inventory.lowStockScan",
  "inventory.lowStockAlert",
  "comm.birthdayScan",
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

/** context/feature-specs/36-platform-configuration.md — the email "send" step for a staff invite's temp password. */
export interface StaffInvitePayload {
  email: string;
  tempPassword: string;
}

/**
 * context/feature-specs/12-fee-collection-ledger.md — stubbed (no Puppeteer
 * rendering yet, same pattern as appbuild.stub): proves the enqueue -> worker
 * round trip without producing a real PDF.
 */
export interface ReceiptGeneratePayload {
  receiptId: string;
  tenantId: string;
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

export interface ReportCardGeneratePayload {
  reportCardId: string;
  tenantId: string;
}

/** context/feature-specs/20-notifications-announcements.md — resolves the audience and writes one NotificationLog per targeted user. `templateKey` defaults to "announcement.published"; Unit 68's Newsletter reuses this same job with "newsletter.sent" instead, per its own "distinct template key, not a parallel pipeline" scope note. */
export interface AnnouncementFanoutPayload {
  tenantId: string;
  branchId: string;
  announcementId: string;
  templateKey?: string;
}

/** context/feature-specs/21-certificates-ids.md — stubbed like receipt.generate/reportcard.generate (no PDF pipeline yet). */
export interface CertificateGeneratePayload {
  certificateId: string;
  tenantId: string;
  qrData?: string;
}

/**
 * context/feature-specs/50-certificates-depth.md (Open Question 2) — gated
 * on ESIGN_API_KEY/ESIGN_PROVIDER_URL, same honest-stub posture as Unit 40's
 * SMS/WhatsApp adapters: no credentials exist in this environment, so this
 * always logs a stub and leaves the certificate's signatureStatus at
 * REQUESTED. Real completion arrives later via the provider's webhook.
 */
export interface CertificateEsignRequestPayload {
  certificateId: string;
}

/**
 * Unit 55 — a repeatable job (BullMQ `repeat.pattern`, same cron mechanism
 * as Unit 14's fee-reminder scan). The payload carries everything needed to
 * regenerate the report on each firing — nothing is persisted in Postgres,
 * BullMQ itself is the source of truth for "this schedule exists."
 */
export interface ReportsScheduledEmailPayload {
  tenantId: string;
  branchId: string;
  reportType: "attendance" | "fees" | "exams" | "admissions" | "staff";
  recipientEmail: string;
}

/** Unit 56 — fans a `GlobalAnnouncement` out into a real per-tenant/branch `Announcement` row (Unit 20's model), then reuses the existing `announcement.fanout` job unchanged for actual dispatch. Never runs inline in the request handler (AGENTS.md invariant #2). */
export interface PlatformGlobalAnnouncementFanoutPayload {
  globalAnnouncementId: string;
}

/** Unit 57 — a location ping crossed a stop's geofence; alerts guardians of every student allocated to that (routeId, stopId) pair. Reuses the existing PUSH-then-SMS-fallback pipeline (Unit 32/40), no new dispatch logic. */
export interface TransportGeofenceAlertPayload {
  tenantId: string;
  branchId: string;
  routeId: string;
  stopId: string;
}

/** Unit 57 — nightly cron tick (Unit 14's own pattern): no tenantId scans every ACTIVE tenant's vehicles for documents expiring soon; a tenantId scopes to just that tenant. */
export interface TransportExpiryScanPayload {
  tenantId?: string;
}

export interface TransportExpiryAlertPayload {
  tenantId: string;
  branchId: string;
  vehicleId: string;
  regNo: string;
  docType: "fitness" | "insurance" | "permit";
  expiryDate: string;
}

/** Unit 60 — a gate pass was approved for a student; alerts guardians via the existing PUSH-then-SMS-fallback pipeline (Unit 32/40), no new dispatch logic. */
export interface FrontofficeGatePassAlertPayload {
  tenantId: string;
  branchId: string;
  studentId: string;
  gatePassId: string;
  reason: string;
}

/** Unit 64 scope #5 — nightly cron tick (Unit 14's own pattern): no tenantId scans every ACTIVE tenant's inventory items for those at/below lowStockAt; a tenantId scopes to just that tenant. */
export interface InventoryLowStockScanPayload {
  tenantId?: string;
}

export interface InventoryLowStockAlertPayload {
  tenantId: string;
  branchId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  lowStockAt: number;
}

/**
 * Unit 68 scope #4 — no tenantId scans every ACTIVE tenant, matching Unit
 * 14/57/64's own nightly-scan shape. Gated per-user by
 * `CommunicationPreference` (Open Question 2 — confirmed default: on).
 */
export interface CommBirthdayScanPayload {
  tenantId?: string;
}

export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";

export interface JobStatus {
  id: string;
  name: string;
  state: JobState;
  returnValue?: unknown;
  failedReason?: string;
}
