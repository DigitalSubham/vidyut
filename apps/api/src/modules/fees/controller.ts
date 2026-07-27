import type { Request, Response } from "express";
import type {
  AssignFeeStructureInput,
  CreateConcessionInput,
  CreateFeeAssignmentInput,
  CreateFeeHeadInput,
  CreateFeeStructureInput,
  CreateFeeStructureItemInput,
  CreateFineRuleInput,
  DecideConcessionInput,
  ListConcessionsQueryInput,
  ListFeeAssignmentsQueryInput,
  ListFeeHeadsQueryInput,
  ListFeeStructuresQueryInput,
  PatchConcessionInput,
  PatchFeeHeadInput,
  PatchFeeStructureInput,
  PatchFineRuleInput,
} from "@vidyut/validation";
import { created, list, noContent, ok } from "../../core/envelope";
import * as service from "./service";

export async function createFeeHead(req: Request, res: Response): Promise<void> {
  const feeHead = await service.createFeeHead(req.auth!, req.body as CreateFeeHeadInput);
  created(res, feeHead);
}

export async function listFeeHeads(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListFeeHeadsQueryInput;
  const { items, total } = await service.listFeeHeads(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getFeeHead(req: Request, res: Response): Promise<void> {
  const feeHead = await service.getFeeHead(req.auth!, req.params.id!);
  ok(res, feeHead);
}

export async function patchFeeHead(req: Request, res: Response): Promise<void> {
  const feeHead = await service.patchFeeHead(req.auth!, req.params.id!, req.body as PatchFeeHeadInput);
  ok(res, feeHead);
}

export async function deleteFeeHead(req: Request, res: Response): Promise<void> {
  await service.deleteFeeHead(req.auth!, req.params.id!);
  noContent(res);
}

export async function createFeeStructure(req: Request, res: Response): Promise<void> {
  const structure = await service.createFeeStructure(req.auth!, req.body as CreateFeeStructureInput);
  created(res, structure);
}

export async function listFeeStructures(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListFeeStructuresQueryInput;
  const { items, total } = await service.listFeeStructures(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getFeeStructure(req: Request, res: Response): Promise<void> {
  const structure = await service.getFeeStructure(req.auth!, req.params.id!);
  ok(res, structure);
}

export async function patchFeeStructure(req: Request, res: Response): Promise<void> {
  const structure = await service.patchFeeStructure(
    req.auth!,
    req.params.id!,
    req.body as PatchFeeStructureInput
  );
  ok(res, structure);
}

export async function deleteFeeStructure(req: Request, res: Response): Promise<void> {
  await service.deleteFeeStructure(req.auth!, req.params.id!);
  noContent(res);
}

export async function createFeeStructureItem(req: Request, res: Response): Promise<void> {
  const item = await service.createFeeStructureItem(
    req.auth!,
    req.params.structureId!,
    req.body as CreateFeeStructureItemInput
  );
  created(res, item);
}

export async function listFeeStructureItems(req: Request, res: Response): Promise<void> {
  const items = await service.listFeeStructureItems(req.auth!, req.params.structureId!);
  ok(res, items);
}

export async function deleteFeeStructureItem(req: Request, res: Response): Promise<void> {
  await service.deleteFeeStructureItem(req.auth!, req.params.structureId!, req.params.itemId!);
  noContent(res);
}

export async function createFineRule(req: Request, res: Response): Promise<void> {
  const fineRule = await service.createFineRule(
    req.auth!,
    req.params.structureId!,
    req.params.itemId!,
    req.body as CreateFineRuleInput
  );
  created(res, fineRule);
}

export async function patchFineRule(req: Request, res: Response): Promise<void> {
  const fineRule = await service.patchFineRule(
    req.auth!,
    req.params.structureId!,
    req.params.itemId!,
    req.body as PatchFineRuleInput
  );
  ok(res, fineRule);
}

export async function deleteFineRule(req: Request, res: Response): Promise<void> {
  await service.deleteFineRule(req.auth!, req.params.structureId!, req.params.itemId!);
  noContent(res);
}

export async function assignFeeStructureToClass(req: Request, res: Response): Promise<void> {
  const result = await service.assignFeeStructureToClass(
    req.auth!,
    req.params.id!,
    req.body as AssignFeeStructureInput
  );
  ok(res, result);
}

export async function createFeeAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await service.createFeeAssignment(req.auth!, req.body as CreateFeeAssignmentInput);
  created(res, assignment);
}

export async function listFeeAssignments(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListFeeAssignmentsQueryInput;
  const { items, total } = await service.listFeeAssignments(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function deleteFeeAssignment(req: Request, res: Response): Promise<void> {
  await service.deleteFeeAssignment(req.auth!, req.params.id!);
  noContent(res);
}

export async function createConcession(req: Request, res: Response): Promise<void> {
  const concession = await service.createConcession(req.auth!, req.body as CreateConcessionInput);
  created(res, concession);
}

export async function listConcessions(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListConcessionsQueryInput;
  const { items, total } = await service.listConcessions(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getConcession(req: Request, res: Response): Promise<void> {
  const concession = await service.getConcession(req.auth!, req.params.id!);
  ok(res, concession);
}

export async function patchConcession(req: Request, res: Response): Promise<void> {
  const concession = await service.patchConcession(
    req.auth!,
    req.params.id!,
    req.body as PatchConcessionInput
  );
  ok(res, concession);
}

export async function decideConcession(req: Request, res: Response): Promise<void> {
  const concession = await service.decideConcession(
    req.auth!,
    req.params.id!,
    req.body as DecideConcessionInput
  );
  ok(res, concession);
}
