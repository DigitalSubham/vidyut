import type { Request, Response } from "express";
import type { CreateStaffInput, ListStaffQueryInput, PatchStaffInput } from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function createStaff(req: Request, res: Response): Promise<void> {
  const staff = await service.createStaff(req.auth!, req.body as CreateStaffInput);
  created(res, staff);
}

export async function listStaff(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListStaffQueryInput;
  const { items, total } = await service.listStaff(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getStaff(req: Request, res: Response): Promise<void> {
  const staff = await service.getStaff(req.auth!, req.params.id!);
  ok(res, staff);
}

export async function patchStaff(req: Request, res: Response): Promise<void> {
  const staff = await service.patchStaff(req.auth!, req.params.id!, req.body as PatchStaffInput);
  ok(res, staff);
}
