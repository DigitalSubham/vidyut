import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME, type JobName } from "@vidyut/types";
import { processDemoPing } from "./processors/demo-ping";
import { processAppBuildGenerate } from "./processors/appbuild-generate";
import { processStudentsImport } from "./processors/students-import";
import { processGuardianInvite } from "./processors/guardian-invite";
import { processStaffInvite } from "./processors/staff-invite";
import { processReceiptGenerate } from "./processors/receipt-generate";
import { processFeesReminderScan } from "./processors/fees-reminder-scan";
import { processFeesReminderSend } from "./processors/fees-reminder-send";
import { processStudentsAbsenceAlert } from "./processors/students-absence-alert";
import { processReportCardGenerate } from "./processors/reportcard-generate";
import { processAnnouncementFanout } from "./processors/announcement-fanout";
import { processCertificateGenerate } from "./processors/certificate-generate";
import { processCertificateEsignRequest } from "./processors/certificate-esign-request";
import { processReportsScheduledEmail } from "./processors/reports-scheduled-email";
import { processPlatformGlobalAnnouncementFanout } from "./processors/platform-global-announcement-fanout";
import { processTransportGeofenceAlert } from "./processors/transport-geofence-alert";
import { processTransportExpiryScan } from "./processors/transport-expiry-scan";
import { processTransportExpiryAlert } from "./processors/transport-expiry-alert";
import { processFrontofficeGatePassAlert } from "./processors/frontoffice-gatepass-alert";
import { processInventoryLowStockScan } from "./processors/inventory-lowstock-scan";
import { processInventoryLowStockAlert } from "./processors/inventory-lowstock-alert";
import { processCommBirthdayScan } from "./processors/comm-birthday-scan";
import { enqueue } from "./enqueue";
import { initSentry, captureJobError } from "./sentry";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const processors: Record<JobName, (job: Job) => Promise<unknown>> = {
  "demo.ping": processDemoPing,
  "appbuild.generate": processAppBuildGenerate,
  "students.import": processStudentsImport,
  "guardian.invite": processGuardianInvite,
  "staff.invite": processStaffInvite,
  "receipt.generate": processReceiptGenerate,
  "fees.reminderScan": processFeesReminderScan,
  "fees.reminderSend": processFeesReminderSend,
  "students.absenceAlert": processStudentsAbsenceAlert,
  "reportcard.generate": processReportCardGenerate,
  "announcement.fanout": processAnnouncementFanout,
  "certificate.generate": processCertificateGenerate,
  "certificate.esign-request": processCertificateEsignRequest,
  "reports.scheduledEmail": processReportsScheduledEmail,
  "platform.globalAnnouncementFanout": processPlatformGlobalAnnouncementFanout,
  "transport.geofenceAlert": processTransportGeofenceAlert,
  "transport.expiryScan": processTransportExpiryScan,
  "transport.expiryAlert": processTransportExpiryAlert,
  "frontoffice.gatePassAlert": processFrontofficeGatePassAlert,
  "inventory.lowStockScan": processInventoryLowStockScan,
  "inventory.lowStockAlert": processInventoryLowStockAlert,
  "comm.birthdayScan": processCommBirthdayScan,
};

export function startWorker(): Worker {
  const connection = new IORedis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const processor = processors[job.name as JobName];
      if (!processor) {
        throw new Error(`No processor registered for job "${job.name}"`);
      }
      return processor(job);
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] job ${job?.id} (${job?.name}) failed:`, err);
    captureJobError(err, { jobName: job?.name ?? "unknown", jobId: job?.id });
  });

  return worker;
}

/**
 * Registers the nightly fee-reminder scan as a BullMQ repeatable job.
 * Idempotent — BullMQ dedupes repeatable jobs sharing the same name+pattern,
 * so calling this on every process start doesn't pile up duplicates. Only
 * called for the real long-running worker process (see below), not by tests
 * that import startWorker() directly.
 */
async function scheduleFeesReminderScan(): Promise<void> {
  await enqueue("fees.reminderScan", {}, { repeat: { pattern: "0 9 * * *" } });
}

/** Unit 57 scope #5 — same idempotent nightly-repeat registration as above. */
async function scheduleTransportExpiryScan(): Promise<void> {
  await enqueue("transport.expiryScan", {}, { repeat: { pattern: "0 9 * * *" } });
}

/** Unit 64 scope #5 — same idempotent nightly-repeat registration as the fee-reminder/transport-expiry scans above. */
async function scheduleInventoryLowStockScan(): Promise<void> {
  await enqueue("inventory.lowStockScan", {}, { repeat: { pattern: "0 9 * * *" } });
}

/** Unit 68 scope #4 — same idempotent nightly-repeat registration, fired early morning so a birthday greeting arrives before the school day starts. */
async function scheduleCommBirthdayScan(): Promise<void> {
  await enqueue("comm.birthdayScan", {}, { repeat: { pattern: "0 7 * * *" } });
}

if (require.main === module) {
  initSentry();
  startWorker();
  void scheduleFeesReminderScan();
  void scheduleTransportExpiryScan();
  void scheduleInventoryLowStockScan();
  void scheduleCommBirthdayScan();
  // eslint-disable-next-line no-console
  console.log(`[worker] listening on queue "${QUEUE_NAME}"`);
}
