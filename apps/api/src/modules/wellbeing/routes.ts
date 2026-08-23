import { Router } from "express";
import {
  canteenTxnSchema,
  createAwardSchema,
  createDisciplineIncidentSchema,
  createLostFoundEntrySchema,
  getCanteenWalletQuerySchema,
  getHealthRecordQuerySchema,
  listAwardsQuerySchema,
  listDisciplineIncidentsQuerySchema,
  listLostFoundEntriesQuerySchema,
  upsertHealthRecordSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const wellbeingRouter = Router();

wellbeingRouter.use(authGuard, tenantContext, requirePermission("wellbeing.manage"));

wellbeingRouter.post("/health-records", validateBody(upsertHealthRecordSchema), asyncHandler(controller.upsertHealthRecord));
wellbeingRouter.get(
  "/health-records",
  validateQuery(getHealthRecordQuerySchema),
  asyncHandler(controller.getHealthRecord)
);

wellbeingRouter.post(
  "/discipline-incidents",
  validateBody(createDisciplineIncidentSchema),
  asyncHandler(controller.createDisciplineIncident)
);
wellbeingRouter.get(
  "/discipline-incidents",
  validateQuery(listDisciplineIncidentsQuerySchema),
  asyncHandler(controller.listDisciplineIncidents)
);

wellbeingRouter.post("/awards", validateBody(createAwardSchema), asyncHandler(controller.createAward));
wellbeingRouter.get("/awards", validateQuery(listAwardsQuerySchema), asyncHandler(controller.listAwards));

wellbeingRouter.post(
  "/canteen-wallet/credit",
  validateBody(canteenTxnSchema),
  asyncHandler(controller.creditCanteenWallet)
);
wellbeingRouter.post(
  "/canteen-wallet/debit",
  validateBody(canteenTxnSchema),
  asyncHandler(controller.debitCanteenWallet)
);
wellbeingRouter.get(
  "/canteen-wallet",
  validateQuery(getCanteenWalletQuerySchema),
  asyncHandler(controller.getCanteenWallet)
);

wellbeingRouter.post(
  "/lost-found",
  validateBody(createLostFoundEntrySchema),
  asyncHandler(controller.createLostFoundEntry)
);
wellbeingRouter.post("/lost-found/:id/claim", asyncHandler(controller.claimLostFoundEntry));
wellbeingRouter.get(
  "/lost-found",
  validateQuery(listLostFoundEntriesQuerySchema),
  asyncHandler(controller.listLostFoundEntries)
);
