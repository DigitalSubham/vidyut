import { Router } from "express";
import { createPublicNoticeSchema, listPublicNoticesQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const publicNoticesRouter = Router();

publicNoticesRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

/** Reuses `announcement.send` — issuing a public notice is the same kind of
 * admin action as an internal announcement, just aimed at the public site. */
publicNoticesRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("announcement.send"),
  validateBody(createPublicNoticeSchema),
  asyncHandler(controller.createNotice)
);

publicNoticesRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listPublicNoticesQuerySchema),
  asyncHandler(controller.listNotices)
);
