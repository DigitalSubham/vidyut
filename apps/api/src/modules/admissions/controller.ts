import type { Request, Response } from "express";
import type {
  ConvertApplicationInput,
  CreateApplicationInput,
  CreateEnquiryInput,
  ListApplicationsQueryInput,
  ListEnquiriesQueryInput,
  PatchApplicationInput,
  PatchEnquiryInput,
} from "@vidyut/validation";
import { created, list, ok } from "../../core/envelope";
import * as service from "./service";

export async function createEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await service.createEnquiry(req.auth!, req.body as CreateEnquiryInput);
  created(res, enquiry);
}

export async function listEnquiries(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListEnquiriesQueryInput;
  const { items, total } = await service.listEnquiries(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await service.getEnquiry(req.auth!, req.params.id!);
  ok(res, enquiry);
}

export async function patchEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await service.patchEnquiry(req.auth!, req.params.id!, req.body as PatchEnquiryInput);
  ok(res, enquiry);
}

export async function createApplication(req: Request, res: Response): Promise<void> {
  const application = await service.createApplication(req.auth!, req.body as CreateApplicationInput);
  created(res, application);
}

export async function listApplications(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListApplicationsQueryInput;
  const { items, total } = await service.listApplications(req.auth!, query);
  list(res, items, { page: query.page, pageSize: query.pageSize, total });
}

export async function getApplication(req: Request, res: Response): Promise<void> {
  const application = await service.getApplication(req.auth!, req.params.id!);
  ok(res, application);
}

export async function patchApplication(req: Request, res: Response): Promise<void> {
  const application = await service.patchApplication(
    req.auth!,
    req.params.id!,
    req.body as PatchApplicationInput
  );
  ok(res, application);
}

export async function convertApplication(req: Request, res: Response): Promise<void> {
  const { sectionId } = req.body as ConvertApplicationInput;
  const application = await service.convertApplication(req.auth!, req.params.id!, sectionId);
  ok(res, application);
}
