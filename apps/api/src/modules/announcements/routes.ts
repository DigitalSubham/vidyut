import { Router } from "express";
import { createAnnouncementSchema, listAnnouncementsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const announcementsRouter = Router();

announcementsRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;
const branchIdFromQuery = (req: { query: { branchId?: unknown } }) =>
  typeof req.query.branchId === "string" ? req.query.branchId : undefined;

announcementsRouter.post(
  "/",
  requireBranch(branchIdFromBody),
  requirePermission("announcement.send"),
  validateBody(createAnnouncementSchema),
  asyncHandler(controller.createAnnouncement)
);

announcementsRouter.get(
  "/",
  requireBranch(branchIdFromQuery),
  validateQuery(listAnnouncementsQuerySchema),
  asyncHandler(controller.listAnnouncements)
);

announcementsRouter.delete(
  "/:id",
  requirePermission("announcement.send"),
  asyncHandler(controller.deleteAnnouncement)
);
