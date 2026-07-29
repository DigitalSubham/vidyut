import type { Request, Response } from "express";
import type { CreateRoleInput, PatchRolePermissionsInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createRole(req: Request, res: Response): Promise<void> {
  const role = await service.createRole(req.auth!, req.body as CreateRoleInput);
  created(res, role);
}

export async function listRoles(req: Request, res: Response): Promise<void> {
  const roles = await service.listRoles(req.auth!);
  ok(res, roles);
}

export async function patchRolePermissions(req: Request, res: Response): Promise<void> {
  const role = await service.patchRolePermissions(req.auth!, req.params.id!, req.body as PatchRolePermissionsInput);
  ok(res, role);
}
