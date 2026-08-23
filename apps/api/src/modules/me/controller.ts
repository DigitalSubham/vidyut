import type { Request, Response } from "express";
import type {
  CreateDataDeletionRequestInput,
  ListMyNotificationsQueryInput,
  MyAttendanceQueryInput,
  MyCalendarQueryInput,
  MyHomeworkCalendarQueryInput,
  MyStudentScopedQueryInput,
  RegisterPushTokenInput,
  SetCommunicationPreferenceInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
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

export async function getMyHomeworkCalendar(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyHomeworkCalendarQueryInput;
  const calendar = await service.getMyHomeworkCalendar(req.auth!, query);
  ok(res, calendar);
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

export async function getMyTeachers(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const teachers = await service.getMyTeachers(req.auth!, query);
  ok(res, teachers);
}

export async function getMyGuardian(req: Request, res: Response): Promise<void> {
  const guardian = await service.getMyGuardian(req.auth!);
  ok(res, guardian);
}

export async function getMyCirculars(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyStudentScopedQueryInput;
  const circulars = await service.getMyCirculars(req.auth!, query);
  ok(res, circulars);
}

export async function getMyCalendar(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as MyCalendarQueryInput;
  const calendar = await service.getMyCalendar(req.auth!, query);
  ok(res, calendar);
}

export async function getMyDataExport(req: Request, res: Response): Promise<void> {
  const data = await service.getMyDataExport(req.auth!);
  ok(res, data);
}

export async function createDataDeletionRequest(req: Request, res: Response): Promise<void> {
  const request = await service.createDataDeletionRequest(req.auth!, req.body as CreateDataDeletionRequestInput);
  created(res, request);
}

export async function getMyNotifications(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListMyNotificationsQueryInput;
  const { items, total } = await service.getMyNotifications(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const notification = await service.markNotificationRead(req.auth!, req.params.id!);
  ok(res, notification);
}

export async function registerPushToken(req: Request, res: Response): Promise<void> {
  const user = await service.registerPushToken(req.auth!, req.body as RegisterPushTokenInput);
  ok(res, { id: user.id });
}

export async function markTourSeen(req: Request, res: Response): Promise<void> {
  const user = await service.markTourSeen(req.auth!);
  ok(res, { id: user.id, hasSeenTour: user.hasSeenTour });
}

export async function getTourSeen(req: Request, res: Response): Promise<void> {
  const result = await service.getTourSeen(req.auth!);
  ok(res, { hasSeenTour: result?.hasSeenTour ?? false });
}

export async function getMyCommunicationPreferences(req: Request, res: Response): Promise<void> {
  const preferences = await service.getMyCommunicationPreferences(req.auth!);
  ok(res, preferences);
}

export async function setMyCommunicationPreference(req: Request, res: Response): Promise<void> {
  const preference = await service.setMyCommunicationPreference(req.auth!, req.body as SetCommunicationPreferenceInput);
  ok(res, preference);
}
