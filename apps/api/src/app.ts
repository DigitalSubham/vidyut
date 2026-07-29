import express, { type Express } from "express";
import { requestId } from "./core/request-id";
import { structuredLogging } from "./core/logger";
import { security } from "./core/security";
import { defaultRateLimiter } from "./core/rate-limit";
import { errorHandler } from "./core/envelope";
import { docsRouter } from "./core/docs";
import { healthRouter } from "./modules/health/routes";
import { authRouter } from "./modules/auth/routes";
import { academicRouter } from "./modules/academic/routes";
import { studentsRouter } from "./modules/students/routes";
import { guardiansRouter, studentGuardiansRouter } from "./modules/guardians/routes";
import { staffRouter } from "./modules/staff/routes";
import { leaveRouter } from "./modules/leave/routes";
import { applicationsRouter, enquiriesRouter } from "./modules/admissions/routes";
import {
  concessionsRouter,
  feeAssignmentsRouter,
  feeHeadsRouter,
  feeStructuresRouter,
} from "./modules/fees/routes";
import {
  feeReportsRouter,
  invoicesRouter,
  paymentsRouter,
  reconciliationRouter,
  receiptsRouter,
  studentFeeLedgerRouter,
} from "./modules/payments/routes";
import { razorpayWebhookRouter, refundRequestsRouter } from "./modules/online-payments/routes";
import { feeRemindersRouter, notificationsRouter } from "./modules/notifications/routes";
import { attendanceRouter, deviceScanRouter } from "./modules/attendance/routes";
import { examsRouter } from "./modules/exams/routes";
import { onlineExamsRouter } from "./modules/online-exams/routes";
import { questionBankRouter } from "./modules/question-bank/routes";
import { marksRouter } from "./modules/marks/routes";
import { reportCardTemplatesRouter, reportCardsRouter } from "./modules/reportcards/routes";
import { announcementsRouter } from "./modules/announcements/routes";
import { certificatesRouter } from "./modules/certificates/routes";
import { timetableRouter } from "./modules/timetable/routes";
import { homeworkRouter } from "./modules/homework/routes";
import { meRouter } from "./modules/me/routes";
import { dashboardRouter } from "./modules/dashboard/routes";
import { publicRouter } from "./modules/public/routes";
import { tenantsRouter } from "./modules/tenants/routes";
import { jobsRouter } from "./modules/jobs/routes";
import { sampleRouter } from "./modules/sample/routes";
import { platformRouter } from "./modules/platform/routes";
import { usersRouter } from "./modules/users/routes";
import { rolesRouter } from "./modules/roles/routes";
import { searchRouter } from "./modules/search/routes";
import { dataDeletionRequestsRouter } from "./modules/dpdp/routes";

/**
 * Builds the Express app instance. Pipeline order per
 * context/api-conventions.md: X-Request-Id -> rate-limit -> auth ->
 * tenant-context -> branch-scope -> RBAC -> Zod validate -> handler. The
 * first two stages are global (mounted here); the rest are per-route guard
 * chains (see each module's routes.ts) since Express has no clean way to
 * open a per-request transaction/context across an entire router.
 *
 * No app.listen() here — see server.ts. Keeping app construction separate
 * from listening is what let Unit 03 test routes via supertest without a
 * running server, and lets tests here do the same.
 */
export function createApp(): Express {
  const app = express();

  app.use(requestId);
  app.use(structuredLogging);
  app.use(...security);
  app.use(
    express.json({
      // Unit 13's Razorpay webhook needs the exact raw bytes to verify the
      // HMAC signature — JSON.stringify(req.body) would not reproduce them.
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    })
  );

  // Liveness/readiness/docs are deliberately unauthenticated and unlimited —
  // uptime monitors and the docs UI shouldn't be rate-limited or gated.
  app.use(healthRouter);
  app.use("/api/v1", docsRouter);

  app.use(defaultRateLimiter);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/academic", academicRouter);
  app.use("/api/v1/students", studentsRouter);
  app.use("/api/v1/students", studentGuardiansRouter);
  app.use("/api/v1/guardians", guardiansRouter);
  app.use("/api/v1/staff", staffRouter);
  app.use("/api/v1/leave-requests", leaveRouter);
  app.use("/api/v1/enquiries", enquiriesRouter);
  app.use("/api/v1/applications", applicationsRouter);
  app.use("/api/v1/fee-heads", feeHeadsRouter);
  app.use("/api/v1/fee-structures", feeStructuresRouter);
  app.use("/api/v1/fee-assignments", feeAssignmentsRouter);
  app.use("/api/v1/concessions", concessionsRouter);
  app.use("/api/v1/invoices", invoicesRouter);
  app.use("/api/v1/payments", paymentsRouter);
  app.use("/api/v1/fees/reports", feeReportsRouter);
  app.use("/api/v1/students", studentFeeLedgerRouter);
  app.use("/api/v1/fees/reconciliation", reconciliationRouter);
  app.use("/api/v1/receipts", receiptsRouter);
  app.use("/api/v1/refund-requests", refundRequestsRouter);
  app.use("/api/v1/webhooks/razorpay", razorpayWebhookRouter);
  app.use("/api/v1/fees/reminders", feeRemindersRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  // Registered before attendanceRouter — Express matches mount prefixes in
  // registration order, and both mounts share the "/api/v1/attendance" prefix.
  app.use("/api/v1/attendance/device-scan", deviceScanRouter);
  app.use("/api/v1/attendance", attendanceRouter);
  app.use("/api/v1/exams", examsRouter);
  app.use("/api/v1/online-exams", onlineExamsRouter);
  app.use("/api/v1/question-bank", questionBankRouter);
  app.use("/api/v1/marks", marksRouter);
  app.use("/api/v1/report-card-templates", reportCardTemplatesRouter);
  app.use("/api/v1/report-cards", reportCardsRouter);
  app.use("/api/v1/announcements", announcementsRouter);
  app.use("/api/v1/certificates", certificatesRouter);
  app.use("/api/v1/timetable", timetableRouter);
  app.use("/api/v1/homework", homeworkRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/public", publicRouter);
  app.use("/api/v1/tenants", tenantsRouter);
  app.use("/api/v1/jobs", jobsRouter);
  app.use("/api/v1/sample", sampleRouter);
  app.use("/api/v1/platform", platformRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/roles", rolesRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/data-deletion-requests", dataDeletionRequestsRouter);

  app.use(errorHandler);
  return app;
}
