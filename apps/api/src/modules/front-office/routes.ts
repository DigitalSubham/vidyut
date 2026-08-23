import { Router } from "express";
import {
  checkInVisitorSchema,
  createCallLogEntrySchema,
  createComplaintDeskEntrySchema,
  createGatePassSchema,
  createPostalLogEntrySchema,
  listCallLogEntriesQuerySchema,
  listComplaintDeskEntriesQuerySchema,
  listGatePassesQuerySchema,
  listPostalLogEntriesQuerySchema,
  listVisitorsQuerySchema,
  resolveComplaintDeskEntrySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const frontOfficeRouter = Router();

frontOfficeRouter.use(authGuard, tenantContext, requirePermission("frontoffice.manage"));

frontOfficeRouter.post("/visitors", validateBody(checkInVisitorSchema), asyncHandler(controller.checkInVisitor));
frontOfficeRouter.post("/visitors/:id/check-out", asyncHandler(controller.checkOutVisitor));
frontOfficeRouter.get("/visitors", validateQuery(listVisitorsQuerySchema), asyncHandler(controller.listVisitors));

frontOfficeRouter.post("/gate-passes", validateBody(createGatePassSchema), asyncHandler(controller.createGatePass));
frontOfficeRouter.post("/gate-passes/:id/exit", asyncHandler(controller.exitGatePass));
frontOfficeRouter.get("/gate-passes", validateQuery(listGatePassesQuerySchema), asyncHandler(controller.listGatePasses));

frontOfficeRouter.post(
  "/complaints",
  validateBody(createComplaintDeskEntrySchema),
  asyncHandler(controller.createComplaintDeskEntry)
);
frontOfficeRouter.post(
  "/complaints/:id/resolve",
  validateBody(resolveComplaintDeskEntrySchema),
  asyncHandler(controller.resolveComplaintDeskEntry)
);
frontOfficeRouter.get(
  "/complaints",
  validateQuery(listComplaintDeskEntriesQuerySchema),
  asyncHandler(controller.listComplaintDeskEntries)
);

frontOfficeRouter.post("/call-log", validateBody(createCallLogEntrySchema), asyncHandler(controller.createCallLogEntry));
frontOfficeRouter.get("/call-log", validateQuery(listCallLogEntriesQuerySchema), asyncHandler(controller.listCallLogEntries));

frontOfficeRouter.post(
  "/postal-log",
  validateBody(createPostalLogEntrySchema),
  asyncHandler(controller.createPostalLogEntry)
);
frontOfficeRouter.get(
  "/postal-log",
  validateQuery(listPostalLogEntriesQuerySchema),
  asyncHandler(controller.listPostalLogEntries)
);
