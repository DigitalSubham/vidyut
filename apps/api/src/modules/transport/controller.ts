import type { Request, Response } from "express";
import type {
  CreateAllocationInput,
  CreateDriverInput,
  CreateRouteInput,
  CreateRouteStopInput,
  CreateVehicleInput,
  ListAllocationsQueryInput,
  ListDriversQueryInput,
  ListRoutesQueryInput,
  ListVehiclesQueryInput,
  LocationPingInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createRoute(req: Request, res: Response): Promise<void> {
  const route = await service.createRoute(req.auth!, req.body as CreateRouteInput);
  created(res, route);
}

export async function listRoutes(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListRoutesQueryInput;
  const routes = await service.listRoutes(req.auth!, query.branchId);
  ok(res, routes);
}

export async function createRouteStop(req: Request, res: Response): Promise<void> {
  const stop = await service.createRouteStop(req.auth!, req.params.id!, req.body as CreateRouteStopInput);
  created(res, stop);
}

export async function listRouteStops(req: Request, res: Response): Promise<void> {
  const stops = await service.listRouteStops(req.auth!, req.params.id!);
  ok(res, stops);
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  const vehicle = await service.createVehicle(req.auth!, req.body as CreateVehicleInput);
  created(res, vehicle);
}

export async function listVehicles(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListVehiclesQueryInput;
  const vehicles = await service.listVehicles(req.auth!, query.branchId);
  ok(res, vehicles);
}

export async function createDriver(req: Request, res: Response): Promise<void> {
  const driver = await service.createDriver(req.auth!, req.body as CreateDriverInput);
  created(res, driver);
}

export async function listDrivers(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListDriversQueryInput;
  const drivers = await service.listDrivers(req.auth!, query.branchId);
  ok(res, drivers);
}

export async function createAllocation(req: Request, res: Response): Promise<void> {
  const allocation = await service.createAllocation(req.auth!, req.body as CreateAllocationInput);
  created(res, allocation);
}

export async function listAllocations(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListAllocationsQueryInput;
  const allocations = await service.listAllocations(req.auth!, query.routeId, query.studentId);
  ok(res, allocations);
}

export async function recordLocationPing(req: Request, res: Response): Promise<void> {
  const ping = await service.recordLocationPing(req.auth!, req.body as LocationPingInput);
  created(res, ping);
}
