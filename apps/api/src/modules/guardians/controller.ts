import type { Request, Response } from "express";
import type {
  CreateGuardianInput,
  LinkGuardianInput,
  ListGuardiansQueryInput,
  PatchGuardianInput,
} from "@vidyut/validation";
import { created, list, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createGuardian(req: Request, res: Response): Promise<void> {
  const guardian = await service.createGuardian(req.auth!, req.body as CreateGuardianInput);
  created(res, guardian);
}

export async function listGuardians(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListGuardiansQueryInput;
  const { items, total } = await service.listGuardians(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getGuardian(req: Request, res: Response): Promise<void> {
  const guardian = await service.getGuardian(req.auth!, req.params.id!);
  ok(res, guardian);
}

export async function patchGuardian(req: Request, res: Response): Promise<void> {
  const guardian = await service.patchGuardian(req.auth!, req.params.id!, req.body as PatchGuardianInput);
  ok(res, guardian);
}

export async function linkGuardian(req: Request, res: Response): Promise<void> {
  const link = await service.linkGuardianToStudent(
    req.auth!,
    req.params.studentId!,
    req.body as LinkGuardianInput
  );
  created(res, link);
}

export async function unlinkGuardian(req: Request, res: Response): Promise<void> {
  await service.unlinkGuardianFromStudent(req.auth!, req.params.studentId!, req.params.guardianId!);
  noContent(res);
}

export async function inviteGuardian(req: Request, res: Response): Promise<void> {
  const result = await service.inviteGuardian(req.auth!, req.params.id!);
  ok(res, result);
}

export async function getMyChildren(req: Request, res: Response): Promise<void> {
  const children = await service.getMyChildren(req.auth!);
  ok(res, children);
}
