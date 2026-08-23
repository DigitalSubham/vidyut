import type { Request, Response } from "express";
import type {
  CheckInVisitorInput,
  CreateCallLogEntryInput,
  CreateComplaintDeskEntryInput,
  CreateGatePassInput,
  CreatePostalLogEntryInput,
  ListCallLogEntriesQueryInput,
  ListComplaintDeskEntriesQueryInput,
  ListGatePassesQueryInput,
  ListPostalLogEntriesQueryInput,
  ListVisitorsQueryInput,
  ResolveComplaintDeskEntryInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function checkInVisitor(req: Request, res: Response): Promise<void> {
  const visitor = await service.checkInVisitor(req.auth!, req.body as CheckInVisitorInput);
  created(res, visitor);
}

export async function checkOutVisitor(req: Request, res: Response): Promise<void> {
  const visitor = await service.checkOutVisitor(req.auth!, req.params.id!);
  ok(res, visitor);
}

export async function listVisitors(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListVisitorsQueryInput;
  const visitors = await service.listVisitors(req.auth!, query.branchId);
  ok(res, visitors);
}

export async function createGatePass(req: Request, res: Response): Promise<void> {
  const gatePass = await service.createGatePass(req.auth!, req.body as CreateGatePassInput);
  created(res, gatePass);
}

export async function exitGatePass(req: Request, res: Response): Promise<void> {
  const gatePass = await service.exitGatePass(req.auth!, req.params.id!);
  ok(res, gatePass);
}

export async function listGatePasses(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListGatePassesQueryInput;
  const gatePasses = await service.listGatePasses(req.auth!, query.branchId);
  ok(res, gatePasses);
}

export async function createComplaintDeskEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.createComplaintDeskEntry(req.auth!, req.body as CreateComplaintDeskEntryInput);
  created(res, entry);
}

export async function resolveComplaintDeskEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.resolveComplaintDeskEntry(
    req.auth!,
    req.params.id!,
    req.body as ResolveComplaintDeskEntryInput
  );
  ok(res, entry);
}

export async function listComplaintDeskEntries(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListComplaintDeskEntriesQueryInput;
  const entries = await service.listComplaintDeskEntries(req.auth!, query.branchId);
  ok(res, entries);
}

export async function createCallLogEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.createCallLogEntry(req.auth!, req.body as CreateCallLogEntryInput);
  created(res, entry);
}

export async function listCallLogEntries(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListCallLogEntriesQueryInput;
  const entries = await service.listCallLogEntries(req.auth!, query.branchId);
  ok(res, entries);
}

export async function createPostalLogEntry(req: Request, res: Response): Promise<void> {
  const entry = await service.createPostalLogEntry(req.auth!, req.body as CreatePostalLogEntryInput);
  created(res, entry);
}

export async function listPostalLogEntries(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListPostalLogEntriesQueryInput;
  const entries = await service.listPostalLogEntries(req.auth!, query.branchId);
  ok(res, entries);
}
