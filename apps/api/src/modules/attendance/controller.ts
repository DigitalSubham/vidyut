import type { Request, Response } from "express";
import type {
  AttendanceDefaultersQueryInput,
  AttendanceRegisterQueryInput,
  ListAttendanceQueryInput,
  MarkAttendanceInput,
  RegularizeAttendanceInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function markAttendance(req: Request, res: Response): Promise<void> {
  const records = await service.markAttendance(req.auth!, req.body as MarkAttendanceInput);
  created(res, records);
}

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListAttendanceQueryInput;
  const { items, total } = await service.listAttendance(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function regularizeAttendance(req: Request, res: Response): Promise<void> {
  const record = await service.regularizeAttendance(
    req.auth!,
    req.params.id!,
    req.body as RegularizeAttendanceInput
  );
  ok(res, record);
}

export async function getRegister(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as AttendanceRegisterQueryInput;
  const grid = await service.getRegister(req.auth!, query);
  ok(res, grid);
}

export async function getDefaulters(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as AttendanceDefaultersQueryInput;
  const rows = await service.getDefaulters(req.auth!, query);
  ok(res, rows);
}
