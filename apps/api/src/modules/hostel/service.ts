import { getCurrentSessionId, withTenant } from "@vidyut/db";
import type {
  CreateHostelBlockInput,
  CreateRoomAllocationInput,
  CreateRoomInput,
  MarkHostelAttendanceInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createHostelBlock(auth: RequestAuth, input: CreateHostelBlockInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.hostelBlock.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name } })
  );
}

export async function listHostelBlocks(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.hostelBlock.findMany({ where: { branchId, deletedAt: null }, orderBy: { name: "asc" } })
  );
}

async function getBlockOrThrow(auth: RequestAuth, blockId: string) {
  const block = await withTenant(auth.tenantId, (tx) => tx.hostelBlock.findUnique({ where: { id: blockId } }));
  if (!block) {
    throw new AppError("NOT_FOUND", "hostel.errors.blockNotFound");
  }
  return block;
}

export async function createRoom(auth: RequestAuth, blockId: string, input: CreateRoomInput) {
  const block = await getBlockOrThrow(auth, blockId);
  assertBranchAccess(auth, block.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.room.create({
      data: { tenantId: auth.tenantId, branchId: block.branchId, blockId, roomNo: input.roomNo, capacity: input.capacity },
    })
  );
}

export async function listRooms(auth: RequestAuth, blockId: string) {
  const block = await getBlockOrThrow(auth, blockId);
  assertBranchAccess(auth, block.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.room.findMany({ where: { blockId, deletedAt: null }, orderBy: { roomNo: "asc" } })
  );
}

/**
 * Scope #3 — reuses Unit 11's fee engine: find-or-create a MISC `FeeHead`,
 * find-or-create a per-block `FeeStructure` (name "Hostel - <block>") with
 * one `FeeStructureItem` at the given amount, then a `FeeAssignment`. No
 * parallel hostel billing model — same pattern as transport/library.
 *
 * Capacity is enforced here, inside the same transaction as the insert
 * (spec's "Decisions made during build") — count of active (toDate: null)
 * allocations in the room must stay below `Room.capacity`.
 */
export async function createRoomAllocation(auth: RequestAuth, input: CreateRoomAllocationInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const room = await tx.room.findUnique({ where: { id: input.roomId } });
    if (!room) {
      throw new AppError("NOT_FOUND", "hostel.errors.roomNotFound");
    }
    assertBranchAccess(auth, room.branchId);

    const activeCount = await tx.roomAllocation.count({ where: { roomId: room.id, toDate: null } });
    const alreadyResident = await tx.roomAllocation.findUnique({
      where: { studentId_roomId: { studentId: input.studentId, roomId: room.id } },
    });
    if (!alreadyResident && activeCount >= room.capacity) {
      throw new AppError("VALIDATION_ERROR", "hostel.errors.roomFull");
    }

    const sessionId = await getCurrentSessionId(tx, room.branchId);
    if (!sessionId) {
      throw new AppError("VALIDATION_ERROR", "hostel.errors.noCurrentSession");
    }

    const block = await tx.hostelBlock.findUniqueOrThrow({ where: { id: room.blockId } });

    const feeHead =
      (await tx.feeHead.findFirst({ where: { branchId: room.branchId, type: "MISC", name: "Hostel Fee" } })) ??
      (await tx.feeHead.create({
        data: { tenantId: auth.tenantId, branchId: room.branchId, name: "Hostel Fee", type: "MISC" },
      }));

    const structureName = `Hostel - ${block.name}`;
    const structure =
      (await tx.feeStructure.findFirst({ where: { branchId: room.branchId, sessionId, name: structureName } })) ??
      (await tx.feeStructure.create({
        data: { tenantId: auth.tenantId, branchId: room.branchId, sessionId, name: structureName },
      }));

    await tx.feeStructureItem.upsert({
      where: { structureId_feeHeadId: { structureId: structure.id, feeHeadId: feeHead.id } },
      update: { amount: input.feeAmountPaise },
      create: {
        tenantId: auth.tenantId,
        structureId: structure.id,
        feeHeadId: feeHead.id,
        amount: input.feeAmountPaise,
        frequency: "MONTHLY",
      },
    });

    const feeAssignment = await tx.feeAssignment.upsert({
      where: { studentId_structureId: { studentId: input.studentId, structureId: structure.id } },
      update: {},
      create: {
        tenantId: auth.tenantId,
        branchId: room.branchId,
        studentId: input.studentId,
        structureId: structure.id,
      },
    });

    return tx.roomAllocation.upsert({
      where: { studentId_roomId: { studentId: input.studentId, roomId: room.id } },
      update: { fromDate: input.fromDate, toDate: null, feeAssignmentId: feeAssignment.id },
      create: {
        tenantId: auth.tenantId,
        branchId: room.branchId,
        studentId: input.studentId,
        roomId: room.id,
        fromDate: input.fromDate,
        feeAssignmentId: feeAssignment.id,
      },
    });
  });
}

export async function listRoomAllocations(auth: RequestAuth, roomId?: string, studentId?: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.roomAllocation.findMany({
      where: { ...(roomId ? { roomId } : {}), ...(studentId ? { studentId } : {}) },
      orderBy: { createdAt: "desc" },
    })
  );
}

/** Night roll-call — mirrors `markAttendance`'s bulk-upsert shape (Unit 15), keyed by (studentId, date) instead of (sectionId, date, periodId). */
export async function markHostelAttendance(auth: RequestAuth, input: MarkHostelAttendanceInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const records = [];
    for (const record of input.records) {
      const saved = await tx.hostelAttendanceRecord.upsert({
        where: { studentId_date: { studentId: record.studentId, date: input.date } },
        update: { status: record.status, markedById: auth.userId, source: input.source },
        create: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          studentId: record.studentId,
          date: input.date,
          status: record.status,
          markedById: auth.userId,
          source: input.source,
        },
      });
      records.push(saved);
    }
    return records;
  });
}

export async function listHostelAttendance(auth: RequestAuth, branchId: string, date: Date) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.hostelAttendanceRecord.findMany({ where: { branchId, date }, orderBy: { createdAt: "asc" } })
  );
}
