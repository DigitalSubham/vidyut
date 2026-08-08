import { Router } from "express";
import {
  createDataDeletionRequestSchema,
  listMyNotificationsQuerySchema,
  myAttendanceQuerySchema,
  myCalendarQuerySchema,
  myHomeworkCalendarQuerySchema,
  myStudentScopedQuerySchema,
  registerPushTokenSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const meRouter = Router();

meRouter.use(authGuard, tenantContext);

meRouter.get("/students", asyncHandler(controller.getMyStudents));
meRouter.get("/attendance", validateQuery(myAttendanceQuerySchema), asyncHandler(controller.getMyAttendance));
meRouter.get(
  "/report-cards",
  validateQuery(myStudentScopedQuerySchema),
  asyncHandler(controller.getMyReportCards)
);
meRouter.get("/homework", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyHomework));
meRouter.get(
  "/homework/calendar",
  validateQuery(myHomeworkCalendarQuerySchema),
  asyncHandler(controller.getMyHomeworkCalendar)
);
meRouter.get("/timetable", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyTimetable));
meRouter.get("/fees/ledger", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyFeeLedger));
meRouter.get(
  "/announcements",
  validateQuery(myStudentScopedQuerySchema),
  asyncHandler(controller.getMyAnnouncements)
);
meRouter.get("/guardian", asyncHandler(controller.getMyGuardian));
meRouter.get("/circulars", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyCirculars));
meRouter.get("/calendar", validateQuery(myCalendarQuerySchema), asyncHandler(controller.getMyCalendar));
meRouter.get("/data-export", asyncHandler(controller.getMyDataExport));
meRouter.post(
  "/data-delete-request",
  validateBody(createDataDeletionRequestSchema),
  asyncHandler(controller.createDataDeletionRequest)
);
meRouter.get(
  "/notifications",
  validateQuery(listMyNotificationsQuerySchema),
  asyncHandler(controller.getMyNotifications)
);
meRouter.patch("/notifications/:id/read", asyncHandler(controller.markNotificationRead));
meRouter.patch(
  "/push-token",
  validateBody(registerPushTokenSchema),
  asyncHandler(controller.registerPushToken)
);
