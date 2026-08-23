import type { Request, Response } from "express";
import type {
  CanteenTxnInput,
  CreateAwardInput,
  CreateDisciplineIncidentInput,
  CreateLostFoundEntryInput,
  GetCanteenWalletQueryInput,
  GetHealthRecordQueryInput,
  ListAwardsQueryInput,
  ListDisciplineIncidentsQueryInput,
  ListLostFoundEntriesQueryInput,
  UpsertHealthRecordInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function upsertHealthRecord(req: Request, res: Response): Promise<void> {
  const record = await service.upsertHealthRecord(req.auth!, req.body as UpsertHealthRecordInput);
  ok(res, record);
}

export async function getHealthRecord(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as GetHealthRecordQueryInput;
  const record = await service.getHealthRecord(req.auth!, query.studentId);
  ok(res, record);
}

export async function createDisciplineIncident(req: Request, res: Response): Promise<void> {
  const incident = await service.createDisciplineIncident(req.auth!, req.body as CreateDisciplineIncidentInput);
  created(res, incident);
}

export async function listDisciplineIncidents(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListDisciplineIncidentsQueryInput;
  const incidents = await service.listDisciplineIncidents(req.auth!, query.studentId);
  ok(res, incidents);
}

export async function createAward(req: Request, res: Response): Promise<void> {
  const award = await service.createAward(req.auth!, req.body as CreateAwardInput);
  created(res, award);
}

export async function listAwards(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListAwardsQueryInput;
  const awards = await service.listAwards(req.auth!, query.studentId);
  ok(res, awards);
}

export async function creditCanteenWallet(req: Request, res: Response): Promise<void> {
  const wallet = await service.creditCanteenWallet(req.auth!, req.body as CanteenTxnInput);
  ok(res, wallet);
}

export async function debitCanteenWallet(req: Request, res: Response): Promise<void> {
  const wallet = await service.debitCanteenWallet(req.auth!, req.body as CanteenTxnInput);
  ok(res, wallet);
}

export async function getCanteenWallet(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as GetCanteenWalletQueryInput;
  const wallet = await service.getCanteenWallet(req.auth!, query.studentId);
  if (!wallet) {
    throw new AppError("NOT_FOUND", "wellbeing.errors.walletNotFound");
  }
  ok(res, wallet);
}

export async function createLostFoundEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.createLostFoundEntry(req.auth!, req.body as CreateLostFoundEntryInput);
  created(res, entry);
}

export async function claimLostFoundEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.claimLostFoundEntry(req.auth!, req.params.id!);
  ok(res, entry);
}

export async function listLostFoundEntries(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListLostFoundEntriesQueryInput;
  const entries = await service.listLostFoundEntries(req.auth!, query.branchId);
  ok(res, entries);
}
