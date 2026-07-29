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

if (require.main === module) {
  initSentry();
  startWorker();
  void scheduleFeesReminderScan();
  // eslint-disable-next-line no-console
  console.log(`[worker] listening on queue "${QUEUE_NAME}"`);
}
