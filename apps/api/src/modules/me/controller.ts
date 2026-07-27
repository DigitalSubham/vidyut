import type { Request, Response } from "express";
import type { MyAttendanceQueryInput, MyStudentScopedQueryInput } from "@vidyut/validation";
import { ok } from "../../core/envelope";
import * as service from "./service";

export async function getMyStudents(req: Request, res: Response): Promise<void> {
  const students = await service.getMyStudents(req.auth!);
  ok(res, students);
}

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyAttendanceQueryInput;
  const records = await service.getMyAttendance(req.auth!, query);
  ok(res, records);
}

export async function getMyReportCards(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const reportCards = await service.getMyReportCards(req.auth!, query);
  ok(res, reportCards);
}

export async function getMyHomework(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const homework = await service.getMyHomework(req.auth!, query);
  ok(res, homework);
}

export async function getMyTimetable(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const periods = await service.getMyTimetable(req.auth!, query);
  ok(res, periods);
}

export async function getMyFeeLedger(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const entries = await service.getMyFeeLedger(req.auth!, query);
  ok(res, entries);
}

export async function getMyAnnouncements(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const announcements = await service.getMyAnnouncements(req.auth!, query);
  ok(res, announcements);
}

export async function getMyDataExport(req: Request, res: Response): Promise<void> {
  const data = await service.getMyDataExport(req.auth!);
  ok(res, data);
}
