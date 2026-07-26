import type { Request, Response } from "express";
import { ok, noContent } from "../../core/envelope";
import * as authService from "./service";

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const result = await authService.requestOtp(req.body);
  ok(res, result);
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const tokens = await authService.verifyOtp(req.body);
  ok(res, tokens);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.staffLogin(req.body);
  ok(res, result);
}

export async function verifyTwoFa(req: Request, res: Response): Promise<void> {
  const tokens = await authService.verifyTwoFa(req.body);
  ok(res, tokens);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const tokens = await authService.refresh(req.body);
  ok(res, tokens);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.body);
  noContent(res);
}
