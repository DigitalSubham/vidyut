import type { Request, Response } from "express";
import type { InviteUserInput, ListUsersQueryInput, PatchUserInput } from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function inviteUser(req: Request, res: Response): Promise<void> {
  const result = await service.inviteUser(req.auth!, req.body as InviteUserInput);
  created(res, result);
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListUsersQueryInput;
  const { items, total } = await service.listUsers(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function patchUser(req: Request, res: Response): Promise<void> {
  const user = await service.patchUser(req.auth!, req.params.id!, req.body as PatchUserInput);
  ok(res, user);
}
