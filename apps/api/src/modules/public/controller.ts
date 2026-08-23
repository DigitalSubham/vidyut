import type { Request, Response } from "express";
import type { PublicCreateEnquiryInput } from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function getPublicSchoolInfo(req: Request, res: Response): Promise<void> {
  const info = await service.getPublicSchoolInfo(req.params.schoolCode!);
  ok(res, info);
}

export async function submitPublicEnquiry(req: Request, res: Response): Promise<void> {
  const enquiry = await service.submitPublicEnquiry(req.params.schoolCode!, req.body as PublicCreateEnquiryInput);
  created(res, { id: enquiry.id });
}

export async function getPublicNotices(req: Request, res: Response): Promise<void> {
  const notices = await service.getPublicNotices(req.params.schoolCode!);
  ok(res, notices);
}

export async function getPublicGallery(req: Request, res: Response): Promise<void> {
  const gallery = await service.getPublicGallery(req.params.schoolCode!);
  ok(res, gallery);
}

export async function getPublicContact(req: Request, res: Response): Promise<void> {
  const contact = await service.getPublicContact(req.params.schoolCode!);
  ok(res, contact);
}
