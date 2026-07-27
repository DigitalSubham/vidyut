import type { Request, Response } from "express";
import type { ListTenantsQueryInput } from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as platformService from "./service";

export async function login(req: Request, res: Response): Promise<void> {
  const result = await platformService.platformLogin(req.body);
  ok(res, result);
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  const actorId = req.platformAuth!.platformUserId;
  const result = await platformService.createTenant(req.body, actorId);
  created(res, result);
}

export async function listTenants(_req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListTenantsQueryInput;
  const { items, total } = await platformService.listTenants(query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getTenant(req: Request, res: Response): Promise<void> {
  const tenant = await platformService.getTenant(req.params.id!);
  ok(res, tenant);
}

export async function patchTenant(req: Request, res: Response): Promise<void> {
  const actorId = req.platformAuth!.platformUserId;
  const tenant = await platformService.patchTenant(req.params.id!, req.body, actorId);
  ok(res, tenant);
}

export async function getTenantUsage(req: Request, res: Response): Promise<void> {
  const usage = await platformService.getTenantUsage(req.params.id!);
  ok(res, usage);
}

export async function impersonate(req: Request, res: Response): Promise<void> {
  const actorId = req.platformAuth!.platformUserId;
  const result = await platformService.impersonateUser(req.params.id!, req.body.userId, actorId);
  ok(res, result);
}

export async function createPlatformInvoice(req: Request, res: Response): Promise<void> {
  const invoice = await platformService.createPlatformInvoice(req.params.id!, req.body);
  created(res, invoice);
}

export async function listPlatformInvoices(req: Request, res: Response): Promise<void> {
  const invoices = await platformService.listPlatformInvoices(req.params.id!);
  ok(res, invoices);
}

export async function patchPlatformInvoiceStatus(req: Request, res: Response): Promise<void> {
  const invoice = await platformService.patchPlatformInvoiceStatus(
    req.params.id!,
    req.params.invoiceId!,
    req.body
  );
  ok(res, invoice);
}

export async function rechargeWallet(req: Request, res: Response): Promise<void> {
  const wallet = await platformService.rechargeWallet(req.params.id!, req.body);
  ok(res, wallet);
}

export async function getRevenueSummary(req: Request, res: Response): Promise<void> {
  const summary = await platformService.getRevenueSummary(res.locals.query);
  ok(res, summary);
}
