import { z } from "zod";

// --- Unit 57: Transport Management ---

export const createRouteSchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
  name: z.string().trim().min(1, "transport.errors.nameRequired"),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;

export const listRoutesQuerySchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
});
export type ListRoutesQueryInput = z.infer<typeof listRoutesQuerySchema>;

export const createRouteStopSchema = z.object({
  name: z.string().trim().min(1, "transport.errors.nameRequired"),
  sequence: z.coerce.number().int().min(0),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});
export type CreateRouteStopInput = z.infer<typeof createRouteStopSchema>;

export const createVehicleSchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
  regNo: z.string().trim().min(1, "transport.errors.regNoRequired"),
  capacity: z.coerce.number().int().positive().optional(),
  routeId: z.string().min(1).optional(),
  fitnessExpiry: z.coerce.date().optional(),
  insuranceExpiry: z.coerce.date().optional(),
  permitExpiry: z.coerce.date().optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const listVehiclesQuerySchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
});
export type ListVehiclesQueryInput = z.infer<typeof listVehiclesQuerySchema>;

export const createDriverSchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
  name: z.string().trim().min(1, "transport.errors.nameRequired"),
  phone: z.string().trim().min(1, "transport.errors.phoneRequired"),
  licenseNo: z.string().trim().min(1).optional(),
  staffId: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const listDriversQuerySchema = z.object({
  branchId: z.string().min(1, "transport.errors.branchRequired"),
});
export type ListDriversQueryInput = z.infer<typeof listDriversQuerySchema>;

/** Open Question 2 — `fareAmountPaise` feeds a per-route TRANSPORT `FeeStructureItem` (Unit 11's existing fee engine, find-or-created for this route), not a parallel billing model. */
export const createAllocationSchema = z.object({
  studentId: z.string().min(1, "transport.errors.studentRequired"),
  routeId: z.string().min(1, "transport.errors.routeRequired"),
  stopId: z.string().min(1, "transport.errors.stopRequired"),
  fareAmountPaise: z.coerce.number().int().min(0),
});
export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;

export const listAllocationsQuerySchema = z.object({
  routeId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
});
export type ListAllocationsQueryInput = z.infer<typeof listAllocationsQuerySchema>;

/** Open Question 1 — generic, vendor-agnostic location ingestion; no assumption about the source device. */
export const locationPingSchema = z.object({
  vehicleId: z.string().min(1, "transport.errors.vehicleRequired"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});
export type LocationPingInput = z.infer<typeof locationPingSchema>;
