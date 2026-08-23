import { Router } from "express";
import {
  createHostelBlockSchema,
  createRoomAllocationSchema,
  createRoomSchema,
  listHostelAttendanceQuerySchema,
  listHostelBlocksQuerySchema,
  listRoomAllocationsQuerySchema,
  listRoomsQuerySchema,
  markHostelAttendanceSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const hostelRouter = Router();

hostelRouter.use(authGuard, tenantContext);

hostelRouter.post(
  "/blocks",
  requirePermission("hostel.manage"),
  validateBody(createHostelBlockSchema),
  asyncHandler(controller.createHostelBlock)
);
hostelRouter.get(
  "/blocks",
  requirePermission("hostel.manage"),
  validateQuery(listHostelBlocksQuerySchema),
  asyncHandler(controller.listHostelBlocks)
);
hostelRouter.post(
  "/blocks/:id/rooms",
  requirePermission("hostel.manage"),
  validateBody(createRoomSchema),
  asyncHandler(controller.createRoom)
);
hostelRouter.get(
  "/blocks/:id/rooms",
  requirePermission("hostel.manage"),
  validateQuery(listRoomsQuerySchema),
  asyncHandler(controller.listRooms)
);

hostelRouter.post(
  "/allocations",
  requirePermission("hostel.manage"),
  validateBody(createRoomAllocationSchema),
  asyncHandler(controller.createRoomAllocation)
);
hostelRouter.get(
  "/allocations",
  requirePermission("hostel.manage"),
  validateQuery(listRoomAllocationsQuerySchema),
  asyncHandler(controller.listRoomAllocations)
);

// Night roll-call reuses the existing class-attendance permissions
// (attendance.mark/attendance.view) — same precedent Unit 42's staff
// attendance already set, not a new hostel-specific pair.
hostelRouter.post(
  "/attendance",
  requirePermission("attendance.mark"),
  validateBody(markHostelAttendanceSchema),
  asyncHandler(controller.markHostelAttendance)
);
hostelRouter.get(
  "/attendance",
  requirePermission("attendance.view"),
  validateQuery(listHostelAttendanceQuerySchema),
  asyncHandler(controller.listHostelAttendance)
);
