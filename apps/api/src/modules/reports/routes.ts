import { Router } from "express";
import { kpiSummaryQuerySchema, reportQuerySchema, scheduleReportSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const reportsRouter = Router();

reportsRouter.use(authGuard, tenantContext);

reportsRouter.get("/attendance", validateQuery(reportQuerySchema), asyncHandler(controller.getAttendanceReport));
reportsRouter.get("/fees", validateQuery(reportQuerySchema), asyncHandler(controller.getFeesReport));
reportsRouter.get("/exams", validateQuery(reportQuerySchema), asyncHandler(controller.getExamsReport));
reportsRouter.get("/admissions", validateQuery(reportQuerySchema), asyncHandler(controller.getAdmissionsReport));
reportsRouter.get("/staff", validateQuery(reportQuerySchema), asyncHandler(controller.getStaffReport));
reportsRouter.get("/kpi-summary", validateQuery(kpiSummaryQuerySchema), asyncHandler(controller.getKpiSummary));
reportsRouter.post("/schedule", validateBody(scheduleReportSchema), asyncHandler(controller.scheduleReport));
