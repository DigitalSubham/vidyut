import { withTenant } from "@vidyut/db";
import type { CreatePTMSlotInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import type { RequestAuth } from "../../core/guards/types";

/** Resolves the caller's own Staff record — a teacher can only ever offer slots for themselves. */
async function resolveOwnStaff(auth: RequestAuth) {
  const staff = await withTenant(auth.tenantId, (tx) => tx.staff.findUnique({ where: { userId: auth.userId } }));
  if (!staff) {
    throw new AppError("FORBIDDEN", "engagement.errors.notStaff");
  }
  return staff;
}

async function resolveOwnGuardian(auth: RequestAuth) {
  const guardian = await withTenant(auth.tenantId, (tx) => tx.guardian.findFirst({ where: { userId: auth.userId } }));
  if (!guardian) {
    throw new AppError("FORBIDDEN", "engagement.errors.notGuardian");
  }
  return guardian;
}

export async function createSlot(auth: RequestAuth, input: CreatePTMSlotInput) {
  const staff = await resolveOwnStaff(auth);

  return withTenant(auth.tenantId, (tx) =>
    tx.pTMSlot.create({
      data: {
        tenantId: auth.tenantId,
        branchId: staff.branchId,
        staffId: staff.id,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    })
  );
}

/** Open to any authenticated user, staff or self-scoped alike — a PTM slot's timing is low-sensitivity, matching a public timetable's exposure level, and a parent needs to browse a teacher's open slots before booking. */
export async function listSlotsForStaff(auth: RequestAuth, staffId: string, availableOnly?: boolean) {
  return withTenant(auth.tenantId, (tx) =>
    tx.pTMSlot.findMany({
      where: { staffId, ...(availableOnly ? { bookedByGuardianId: null } : {}) },
      orderBy: { startTime: "asc" },
    })
  );
}

export async function bookSlot(auth: RequestAuth, id: string) {
  const guardian = await resolveOwnGuardian(auth);

  return withTenant(auth.tenantId, async (tx) => {
    const slot = await tx.pTMSlot.findUnique({ where: { id } });
    if (!slot) {
      throw new AppError("NOT_FOUND", "engagement.errors.slotNotFound");
    }
    if (slot.bookedByGuardianId) {
      throw new AppError("CONFLICT", "engagement.errors.slotAlreadyBooked");
    }

    return tx.pTMSlot.update({ where: { id }, data: { bookedByGuardianId: guardian.id } });
  });
}
