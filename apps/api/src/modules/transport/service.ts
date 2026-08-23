import { getCurrentSessionId, withTenant } from "@vidyut/db";
import type {
  CreateAllocationInput,
  CreateDriverInput,
  CreateRouteInput,
  CreateRouteStopInput,
  CreateVehicleInput,
  LocationPingInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";
import { isWithinGeofence } from "./geofence";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createRoute(auth: RequestAuth, input: CreateRouteInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.route.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name } })
  );
}

export async function listRoutes(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.route.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: "asc" } })
  );
}

async function getRouteOrThrow(auth: RequestAuth, routeId: string) {
  const route = await withTenant(auth.tenantId, (tx) => tx.route.findUnique({ where: { id: routeId } }));
  if (!route) {
    throw new AppError("NOT_FOUND", "transport.errors.routeNotFound");
  }
  return route;
}

export async function createRouteStop(auth: RequestAuth, routeId: string, input: CreateRouteStopInput) {
  const route = await getRouteOrThrow(auth, routeId);
  assertBranchAccess(auth, route.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.routeStop.create({
      data: {
        tenantId: auth.tenantId,
        routeId,
        name: input.name,
        sequence: input.sequence,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    })
  );
}

export async function listRouteStops(auth: RequestAuth, routeId: string) {
  const route = await getRouteOrThrow(auth, routeId);
  assertBranchAccess(auth, route.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.routeStop.findMany({ where: { routeId }, orderBy: { sequence: "asc" } })
  );
}

export async function createVehicle(auth: RequestAuth, input: CreateVehicleInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.vehicle.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        regNo: input.regNo,
        capacity: input.capacity,
        routeId: input.routeId,
        fitnessExpiry: input.fitnessExpiry,
        insuranceExpiry: input.insuranceExpiry,
        permitExpiry: input.permitExpiry,
      },
    })
  );
}

export async function listVehicles(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.vehicle.findMany({ where: { branchId, deletedAt: null }, orderBy: { regNo: "asc" } })
  );
}

export async function createDriver(auth: RequestAuth, input: CreateDriverInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.driver.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        name: input.name,
        phone: input.phone,
        licenseNo: input.licenseNo,
        staffId: input.staffId,
        vehicleId: input.vehicleId,
      },
    })
  );
}

export async function listDrivers(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.driver.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: "asc" } })
  );
}

/**
 * Open Question 2 — reuses Unit 11's fee engine: find-or-create a
 * TRANSPORT `FeeHead` for the branch, find-or-create a per-route
 * `FeeStructure` (name "Transport - <route>") with one `FeeStructureItem`
 * at the given fare, then a `FeeAssignment` for the student. No parallel
 * transport billing model.
 */
export async function createAllocation(auth: RequestAuth, input: CreateAllocationInput) {
  const route = await getRouteOrThrow(auth, input.routeId);
  assertBranchAccess(auth, route.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const stop = await tx.routeStop.findUnique({ where: { id: input.stopId } });
    if (!stop || stop.routeId !== input.routeId) {
      throw new AppError("VALIDATION_ERROR", "transport.errors.stopNotOnRoute");
    }

    const sessionId = await getCurrentSessionId(tx, route.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "transport.errors.noCurrentSession");
    }

    const feeHead =
      (await tx.feeHead.findFirst({ where: { branchId: route.branchId, type: "TRANSPORT" } })) ??
      (await tx.feeHead.create({
        data: { tenantId: auth.tenantId, branchId: route.branchId, name: "Transport", type: "TRANSPORT" },
      }));

    const structureName = `Transport - ${route.name}`;
    const structure =
      (await tx.feeStructure.findFirst({ where: { branchId: route.branchId, sessionId, name: structureName } })) ??
      (await tx.feeStructure.create({
        data: { tenantId: auth.tenantId, branchId: route.branchId, sessionId, name: structureName },
      }));

    const item = await tx.feeStructureItem.upsert({
      where: { structureId_feeHeadId: { structureId: structure.id, feeHeadId: feeHead.id } },
      update: { amount: input.fareAmountPaise },
      create: {
        tenantId: auth.tenantId,
        structureId: structure.id,
        feeHeadId: feeHead.id,
        amount: input.fareAmountPaise,
        frequency: "MONTHLY",
      },
    });
    void item;

    const feeAssignment = await tx.feeAssignment.upsert({
      where: { studentId_structureId: { studentId: input.studentId, structureId: structure.id } },
      update: {},
      create: {
        tenantId: auth.tenantId,
        branchId: route.branchId,
        studentId: input.studentId,
        structureId: structure.id,
      },
    });

    return tx.studentRouteAllocation.upsert({
      where: { studentId_routeId: { studentId: input.studentId, routeId: input.routeId } },
      update: { stopId: input.stopId, feeAssignmentId: feeAssignment.id },
      create: {
        tenantId: auth.tenantId,
        branchId: route.branchId,
        studentId: input.studentId,
        routeId: input.routeId,
        stopId: input.stopId,
        feeAssignmentId: feeAssignment.id,
      },
    });
  });
}

export async function listAllocations(auth: RequestAuth, routeId?: string, studentId?: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.studentRouteAllocation.findMany({
      where: { ...(routeId ? { routeId } : {}), ...(studentId ? { studentId } : {}) },
      orderBy: { createdAt: "desc" },
    })
  );
}

/**
 * Open Question 1 — generic ingestion, vendor-agnostic (no auth guard tied
 * to a specific device SDK here; a real deployment would gate this behind a
 * per-vehicle device token, same convention as Unit 44's
 * `attendanceDeviceToken` on Branch — not built until a real device exists
 * to design that token flow against).
 */
export async function recordLocationPing(auth: RequestAuth, input: LocationPingInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new AppError("NOT_FOUND", "transport.errors.vehicleNotFound");
    }

    const previousPing = await tx.locationPing.findFirst({
      where: { vehicleId: input.vehicleId },
      orderBy: { recordedAt: "desc" },
    });

    const ping = await tx.locationPing.create({
      data: {
        tenantId: auth.tenantId,
        vehicleId: input.vehicleId,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    if (vehicle.routeId) {
      const stops = await tx.routeStop.findMany({
        where: { routeId: vehicle.routeId, latitude: { not: null }, longitude: { not: null } },
      });

      for (const stop of stops) {
        const nowWithin = isWithinGeofence(input.latitude, input.longitude, stop.latitude!, stop.longitude!);
        const wasWithin = previousPing
          ? isWithinGeofence(previousPing.latitude, previousPing.longitude, stop.latitude!, stop.longitude!)
          : false;

        // Only fires on a genuine transition into range — mirrors Unit 16's
        // "isNewAbsence" pattern, avoiding a duplicate alert on every ping
        // while the bus idles inside the same stop's geofence.
        if (nowWithin && !wasWithin) {
          await enqueue("transport.geofenceAlert", {
            tenantId: auth.tenantId,
            branchId: vehicle.branchId,
            routeId: vehicle.routeId,
            stopId: stop.id,
          });
        }
      }
    }

    return ping;
  });
}
