import { Router } from "express";
import {
  createAllocationSchema,
  createDriverSchema,
  createRouteSchema,
  createRouteStopSchema,
  createVehicleSchema,
  listAllocationsQuerySchema,
  listDriversQuerySchema,
  listRoutesQuerySchema,
  listVehiclesQuerySchema,
  locationPingSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const transportRouter = Router();

transportRouter.use(authGuard, tenantContext);

transportRouter.post(
  "/routes",
  requirePermission("transport.manage"),
  validateBody(createRouteSchema),
  asyncHandler(controller.createRoute)
);
transportRouter.get(
  "/routes",
  requirePermission("transport.manage"),
  validateQuery(listRoutesQuerySchema),
  asyncHandler(controller.listRoutes)
);
transportRouter.post(
  "/routes/:id/stops",
  requirePermission("transport.manage"),
  validateBody(createRouteStopSchema),
  asyncHandler(controller.createRouteStop)
);
transportRouter.get(
  "/routes/:id/stops",
  requirePermission("transport.manage"),
  asyncHandler(controller.listRouteStops)
);

transportRouter.post(
  "/vehicles",
  requirePermission("transport.manage"),
  validateBody(createVehicleSchema),
  asyncHandler(controller.createVehicle)
);
transportRouter.get(
  "/vehicles",
  requirePermission("transport.manage"),
  validateQuery(listVehiclesQuerySchema),
  asyncHandler(controller.listVehicles)
);

transportRouter.post(
  "/drivers",
  requirePermission("transport.manage"),
  validateBody(createDriverSchema),
  asyncHandler(controller.createDriver)
);
transportRouter.get(
  "/drivers",
  requirePermission("transport.manage"),
  validateQuery(listDriversQuerySchema),
  asyncHandler(controller.listDrivers)
);

transportRouter.post(
  "/allocations",
  requirePermission("transport.manage"),
  validateBody(createAllocationSchema),
  asyncHandler(controller.createAllocation)
);
transportRouter.get(
  "/allocations",
  requirePermission("transport.manage"),
  validateQuery(listAllocationsQuerySchema),
  asyncHandler(controller.listAllocations)
);

// No requirePermission — Open Question 1's own note: a real deployment
// gates this behind a per-vehicle device token (Unit 44's precedent), not
// built until a real device exists to design that flow against. Still
// behind authGuard/tenantContext, so it's not unauthenticated.
transportRouter.post(
  "/location-ping",
  validateBody(locationPingSchema),
  asyncHandler(controller.recordLocationPing)
);
