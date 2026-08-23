import type { ScheduleReportInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { enqueue } from "../../core/jobs";
import type { RequestAuth } from "../../core/guards/types";

/** WEEKLY = every Monday 9am; MONTHLY = the 1st of the month, 9am — same fixed-hour convention as Unit 14's nightly cron. */
function cronForCadence(cadence: ScheduleReportInput["cadence"]): string {
  return cadence === "WEEKLY" ? "0 9 * * 1" : "0 9 1 * *";
}

/**
 * Unit 55 scope #3 — registers a BullMQ repeatable job. No `ReportSchedule`
 * DB row: the repeatable job's own payload (tenantId/branchId/reportType/
 * recipientEmail) is everything the worker needs on each firing, same
 * "BullMQ is the source of truth" posture as Unit 14's fee-reminder scan.
 */
export async function scheduleReportEmail(auth: RequestAuth, input: ScheduleReportInput): Promise<string> {
  if (!branchAccessAllowed(auth, input.branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }

  return enqueue(
    "reports.scheduledEmail",
    {
      tenantId: auth.tenantId,
      branchId: input.branchId,
      reportType: input.reportType,
      recipientEmail: input.recipientEmail,
    },
    { repeat: { pattern: cronForCadence(input.cadence) } }
  );
}
