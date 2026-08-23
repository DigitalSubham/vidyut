import { withTenant } from "@vidyut/db";
import type {
  CanteenTxnInput,
  CreateAwardInput,
  CreateDisciplineIncidentInput,
  CreateLostFoundEntryInput,
  UpsertHealthRecordInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function upsertHealthRecord(auth: RequestAuth, input: UpsertHealthRecordInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.healthRecord.upsert({
      where: { studentId: input.studentId },
      update: { condition: input.condition, notes: input.notes, emergencyContact: input.emergencyContact },
      create: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: input.studentId,
        condition: input.condition,
        notes: input.notes,
        emergencyContact: input.emergencyContact,
      },
    })
  );
}

export async function getHealthRecord(auth: RequestAuth, studentId: string) {
  return withTenant(auth.tenantId, (tx) => tx.healthRecord.findUnique({ where: { studentId } }));
}

export async function createDisciplineIncident(auth: RequestAuth, input: CreateDisciplineIncidentInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.disciplineIncident.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: input.studentId,
        type: input.type,
        points: input.points,
        note: input.note,
        recordedById: auth.userId,
      },
    })
  );
}

export async function listDisciplineIncidents(auth: RequestAuth, studentId: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.disciplineIncident.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } })
  );
}

export async function createAward(auth: RequestAuth, input: CreateAwardInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.award.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: input.studentId,
        title: input.title,
        awardedAt: input.awardedAt,
      },
    })
  );
}

export async function listAwards(auth: RequestAuth, studentId: string) {
  return withTenant(auth.tenantId, (tx) => tx.award.findMany({ where: { studentId }, orderBy: { awardedAt: "desc" } }));
}

export async function creditCanteenWallet(auth: RequestAuth, input: CanteenTxnInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const wallet =
      (await tx.canteenWallet.findUnique({ where: { studentId: input.studentId } })) ??
      (await tx.canteenWallet.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, studentId: input.studentId } }));
    const [, updated] = await Promise.all([
      tx.canteenTxn.create({
        data: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          walletId: wallet.id,
          type: "CREDIT",
          amount: input.amountPaise,
          reason: input.reason,
        },
      }),
      tx.canteenWallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: input.amountPaise } } }),
    ]);
    return updated;
  });
}

/** A simple POS-style deduct (scope #4) — same never-goes-negative guard as `SmsWallet`'s existing decrement checks. */
export async function debitCanteenWallet(auth: RequestAuth, input: CanteenTxnInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const wallet =
      (await tx.canteenWallet.findUnique({ where: { studentId: input.studentId } })) ??
      (await tx.canteenWallet.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, studentId: input.studentId } }));
    if (wallet.balancePaise < input.amountPaise) {
      throw new AppError("VALIDATION_ERROR", "wellbeing.errors.insufficientBalance");
    }

    const [, updated] = await Promise.all([
      tx.canteenTxn.create({
        data: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          walletId: wallet.id,
          type: "DEBIT",
          amount: input.amountPaise,
          reason: input.reason,
        },
      }),
      tx.canteenWallet.update({ where: { id: wallet.id }, data: { balancePaise: { decrement: input.amountPaise } } }),
    ]);
    return updated;
  });
}

export async function getCanteenWallet(auth: RequestAuth, studentId: string) {
  return withTenant(auth.tenantId, (tx) => tx.canteenWallet.findUnique({ where: { studentId }, include: { txns: { orderBy: { createdAt: "desc" }, take: 20 } } }));
}

export async function createLostFoundEntry(auth: RequestAuth, input: CreateLostFoundEntryInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.lostFoundEntry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        itemDescription: input.itemDescription,
        foundLocation: input.foundLocation,
        foundAt: input.foundAt,
      },
    })
  );
}

export async function claimLostFoundEntry(auth: RequestAuth, id: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const entry = await tx.lostFoundEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new AppError("NOT_FOUND", "wellbeing.errors.lostFoundEntryNotFound");
    }
    assertBranchAccess(auth, entry.branchId);
    return tx.lostFoundEntry.update({
      where: { id },
      data: { status: "CLAIMED", claimedByUserId: auth.userId, claimedAt: new Date() },
    });
  });
}

export async function listLostFoundEntries(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.lostFoundEntry.findMany({ where: { branchId }, orderBy: { foundAt: "desc" } })
  );
}
