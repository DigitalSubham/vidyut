import type { Request, Response } from "express";
import type { KpiSummaryQueryInput, ReportQueryInput, ScheduleReportInput } from "@vidyut/validation";
import { ok, created } from "../../core/envelope";
import { toCsv } from "../../core/csv";
import * as service from "./service";
import { scheduleReportEmail } from "./schedule";

function respond(res: Response, rows: Record<string, unknown>[], format: ReportQueryInput["format"]): void {
  if (format === "csv") {
    res.type("text/csv").send(toCsv(rows));
    return;
  }
  ok(res, rows);
}

export async function getAttendanceReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReportQueryInput;
  const rows = await service.getAttendanceReport(req.auth!, query);
  respond(res, rows, query.format);
}

export async function getFeesReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReportQueryInput;
  const rows = await service.getFeesReport(req.auth!, query);
  respond(res, rows, query.format);
}

export async function getExamsReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReportQueryInput;
  const rows = await service.getExamsReport(req.auth!, query);
  respond(res, rows, query.format);
}

export async function getAdmissionsReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReportQueryInput;
  const rows = await service.getAdmissionsReport(req.auth!, query);
  respond(res, rows, query.format);
}

export async function getStaffReport(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ReportQueryInput;
  const rows = await service.getStaffReport(req.auth!, query);
  respond(res, rows, query.format);
}

export async function getKpiSummary(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as KpiSummaryQueryInput;
  const summary = await service.getKpiSummary(req.auth!, query.branchId);
  ok(res, summary);
}

export async function scheduleReport(req: Request, res: Response): Promise<void> {
  const input = req.body as ScheduleReportInput;
  await service.assertReportAccess(req.auth!);
  const jobId = await scheduleReportEmail(req.auth!, input);
  created(res, { jobId });
}
