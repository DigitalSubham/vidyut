import { Router } from "express";
import { myAttendanceQuerySchema, myStudentScopedQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateQuery } from "../../core/guards/validate";
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
meRouter.get("/timetable", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyTimetable));
meRouter.get("/fees/ledger", validateQuery(myStudentScopedQuerySchema), asyncHandler(controller.getMyFeeLedger));
meRouter.get(
  "/announcements",
  validateQuery(myStudentScopedQuerySchema),
  asyncHandler(controller.getMyAnnouncements)
);
meRouter.get("/data-export", asyncHandler(controller.getMyDataExport));
