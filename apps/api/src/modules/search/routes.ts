import { Router } from "express";
import { searchQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const searchRouter = Router();

searchRouter.get(
  "/",
  authGuard,
  tenantContext,
  validateQuery(searchQuerySchema),
  asyncHandler(controller.search)
);
