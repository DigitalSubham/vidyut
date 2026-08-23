import { z } from "zod";

/** Unit 55 — shared query shape for all five standard reports; `format=csv` switches the response body, not the underlying query. */
export const reportQuerySchema = z.object({
  branchId: z.string().min(1, "dashboard.errors.branchRequired"),
  from: z.coerce.date(),
  to: z.coerce.date(),
  format: z.enum(["json", "csv"]).default("json"),
});
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

export const kpiSummaryQuerySchema = z.object({
  branchId: z.string().min(1, "dashboard.errors.branchRequired"),
});
export type KpiSummaryQueryInput = z.infer<typeof kpiSummaryQuerySchema>;

const reportTypeValues = ["attendance", "fees", "exams", "admissions", "staff"] as const;
const cadenceValues = ["WEEKLY", "MONTHLY"] as const;

export const scheduleReportSchema = z.object({
  branchId: z.string().min(1, "dashboard.errors.branchRequired"),
  reportType: z.enum(reportTypeValues),
  cadence: z.enum(cadenceValues),
  recipientEmail: z.string().trim().email("settings.errors.invalidEmail"),
});
export type ScheduleReportInput = z.infer<typeof scheduleReportSchema>;
