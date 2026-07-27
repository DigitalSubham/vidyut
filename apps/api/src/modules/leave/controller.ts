import type { Request, Response } from "express";
import type {
  CreateLeaveRequestInput,
  DecideLeaveRequestInput,
  ListLeaveRequestsQueryInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function createLeaveRequest(req: Request, res: Response): Promise<void> {
  const leaveRequest = await service.createLeaveRequest(req.auth!, req.body as CreateLeaveRequestInput);
  created(res, leaveRequest);
}

export async function listLeaveRequests(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListLeaveRequestsQueryInput;
  const { items, total } = await service.listLeaveRequests(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function decideLeaveRequest(req: Request, res: Response): Promise<void> {
  const leaveRequest = await service.decideLeaveRequest(
    req.auth!,
    req.params.id!,
    req.body as DecideLeaveRequestInput
  );
  ok(res, leaveRequest);
}
