import type { Request, Response } from "express";
import type { CreateStaffTaskInput, ListStaffTasksQueryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createStaffTask(req: Request, res: Response): Promise<void> {
  const task = await service.createStaffTask(req.auth!, req.body as CreateStaffTaskInput);
  created(res, task);
}

export async function listStaffTasks(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStaffTasksQueryInput;
  const tasks = await service.listStaffTasks(req.auth!, query.branchId, query.assignedToId);
  ok(res, tasks);
}

export async function completeStaffTask(req: Request, res: Response): Promise<void> {
  const task = await service.completeStaffTask(req.auth!, req.params.id!);
  ok(res, task);
}
