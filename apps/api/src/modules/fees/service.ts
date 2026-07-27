import { withTenant } from "@vidyut/db";
import type {
  AssignFeeStructureInput,
  CreateConcessionInput,
  CreateFeeAssignmentInput,
  CreateFeeHeadInput,
  CreateFeeStructureInput,
  CreateFeeStructureItemInput,
  CreateFineRuleInput,
  DecideConcessionInput,
  ListConcessionsQueryInput,
  ListFeeAssignmentsQueryInput,
  ListFeeHeadsQueryInput,
  ListFeeStructuresQueryInput,
  PatchConcessionInput,
  PatchFeeHeadInput,
  PatchFeeStructureInput,
  PatchFineRuleInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

// ---------------------------------------------------------------------------
// Fee heads
// ---------------------------------------------------------------------------

export async function createFeeHead(auth: RequestAuth, input: CreateFeeHeadInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.feeHead.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name, type: input.type },
    })
  );
}

export async function listFeeHeads(auth: RequestAuth, query: ListFeeHeadsQueryInput) {
  assertBranchAccess(auth, query.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const where = { branchId: query.branchId, deletedAt: null };
    const [items, total] = await Promise.all([
      tx.feeHead.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.feeHead.count({ where }),
    ]);
    return { items, total };
  });
}

async function getFeeHeadOrThrow(auth: RequestAuth, id: string) {
  const feeHead = await withTenant(auth.tenantId, (tx) => tx.feeHead.findUnique({ where: { id } }));
  if (!feeHead || feeHead.deletedAt) {
    throw new AppError("NOT_FOUND", "fee.errors.feeHeadNotFound");
  }
  return feeHead;
}

export async function getFeeHead(auth: RequestAuth, id: string) {
  return getFeeHeadOrThrow(auth, id);
}

export async function patchFeeHead(auth: RequestAuth, id: string, input: PatchFeeHeadInput) {
  const feeHead = await getFeeHeadOrThrow(auth, id);
  assertBranchAccess(auth, feeHead.branchId);
  return withTenant(auth.tenantId, (tx) => tx.feeHead.update({ where: { id }, data: input }));
}

export async function deleteFeeHead(auth: RequestAuth, id: string): Promise<void> {
  const feeHead = await getFeeHeadOrThrow(auth, id);
  assertBranchAccess(auth, feeHead.branchId);
  await withTenant(auth.tenantId, (tx) =>
    tx.feeHead.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

// ---------------------------------------------------------------------------
// Fee structures
// ---------------------------------------------------------------------------

export async function createFeeStructure(auth: RequestAuth, input: CreateFeeStructureInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.feeStructure.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        sessionId: input.sessionId,
        classId: input.classId,
        name: input.name,
      },
    })
  );
}

export async function listFeeStructures(auth: RequestAuth, query: ListFeeStructuresQueryInput) {
  assertBranchAccess(auth, query.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      deletedAt: null,
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.feeStructure.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.feeStructure.count({ where }),
    ]);
    return { items, total };
  });
}

async function getFeeStructureOrThrow(auth: RequestAuth, id: string) {
  const structure = await withTenant(auth.tenantId, (tx) => tx.feeStructure.findUnique({ where: { id } }));
  if (!structure || structure.deletedAt) {
    throw new AppError("NOT_FOUND", "fee.errors.structureNotFound");
  }
  return structure;
}

export async function getFeeStructure(auth: RequestAuth, id: string) {
  return getFeeStructureOrThrow(auth, id);
}

export async function patchFeeStructure(auth: RequestAuth, id: string, input: PatchFeeStructureInput) {
  const structure = await getFeeStructureOrThrow(auth, id);
  assertBranchAccess(auth, structure.branchId);
  return withTenant(auth.tenantId, (tx) => tx.feeStructure.update({ where: { id }, data: input }));
}

export async function deleteFeeStructure(auth: RequestAuth, id: string): Promise<void> {
  const structure = await getFeeStructureOrThrow(auth, id);
  assertBranchAccess(auth, structure.branchId);
  await withTenant(auth.tenantId, (tx) =>
    tx.feeStructure.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

// ---------------------------------------------------------------------------
// Fee structure items (nested under a structure)
// ---------------------------------------------------------------------------

export async function createFeeStructureItem(
  auth: RequestAuth,
  structureId: string,
  input: CreateFeeStructureItemInput
) {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const feeHead = await tx.feeHead.findUnique({ where: { id: input.feeHeadId } });
    if (!feeHead || feeHead.deletedAt || feeHead.branchId !== structure.branchId) {
      throw new AppError("VALIDATION_ERROR", "fee.errors.feeHeadNotFoundInBranch");
    }

    return tx.feeStructureItem.create({
      data: {
        tenantId: auth.tenantId,
        structureId,
        feeHeadId: input.feeHeadId,
        amount: input.amount,
        frequency: input.frequency,
        dueDayOfMonth: input.dueDayOfMonth,
      },
    });
  });
}

export async function listFeeStructureItems(auth: RequestAuth, structureId: string) {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.feeStructureItem.findMany({ where: { structureId }, include: { feeHead: true, fineRule: true } })
  );
}

async function getFeeStructureItemOrThrow(auth: RequestAuth, structureId: string, itemId: string) {
  const item = await withTenant(auth.tenantId, (tx) => tx.feeStructureItem.findUnique({ where: { id: itemId } }));
  if (!item || item.structureId !== structureId) {
    throw new AppError("NOT_FOUND", "fee.errors.itemNotFound");
  }
  return item;
}

export async function deleteFeeStructureItem(
  auth: RequestAuth,
  structureId: string,
  itemId: string
): Promise<void> {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);
  await getFeeStructureItemOrThrow(auth, structureId, itemId);

  await withTenant(auth.tenantId, (tx) => tx.feeStructureItem.delete({ where: { id: itemId } }));
}

// ---------------------------------------------------------------------------
// Fine rules (nested under a structure item)
// ---------------------------------------------------------------------------

export async function createFineRule(
  auth: RequestAuth,
  structureId: string,
  itemId: string,
  input: CreateFineRuleInput
) {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);
  await getFeeStructureItemOrThrow(auth, structureId, itemId);

  return withTenant(auth.tenantId, (tx) =>
    tx.fineRule.create({
      data: {
        tenantId: auth.tenantId,
        branchId: structure.branchId,
        feeStructureItemId: itemId,
        graceDays: input.graceDays,
        isPercent: input.isPercent,
        value: input.value,
      },
    })
  );
}

export async function patchFineRule(
  auth: RequestAuth,
  structureId: string,
  itemId: string,
  input: PatchFineRuleInput
) {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);
  await getFeeStructureItemOrThrow(auth, structureId, itemId);

  const fineRule = await withTenant(auth.tenantId, (tx) =>
    tx.fineRule.findUnique({ where: { feeStructureItemId: itemId } })
  );
  if (!fineRule) {
    throw new AppError("NOT_FOUND", "fee.errors.fineRuleNotFound");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.fineRule.update({ where: { feeStructureItemId: itemId }, data: input })
  );
}

export async function deleteFineRule(auth: RequestAuth, structureId: string, itemId: string): Promise<void> {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);
  await getFeeStructureItemOrThrow(auth, structureId, itemId);

  const fineRule = await withTenant(auth.tenantId, (tx) =>
    tx.fineRule.findUnique({ where: { feeStructureItemId: itemId } })
  );
  if (!fineRule) {
    throw new AppError("NOT_FOUND", "fee.errors.fineRuleNotFound");
  }

  await withTenant(auth.tenantId, (tx) => tx.fineRule.delete({ where: { feeStructureItemId: itemId } }));
}

// ---------------------------------------------------------------------------
// Fee assignment (bulk-by-class + individual)
// ---------------------------------------------------------------------------

/** Fans out to every currently-enrolled student in the class (context/feature-specs/11's Decisions). */
export async function assignFeeStructureToClass(
  auth: RequestAuth,
  structureId: string,
  input: AssignFeeStructureInput
) {
  const structure = await getFeeStructureOrThrow(auth, structureId);
  assertBranchAccess(auth, structure.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: { classId: input.classId, session: { isCurrent: true } },
      select: { studentId: true },
    });
    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    if (studentIds.length === 0) {
      return { assigned: 0 };
    }

    const result = await tx.feeAssignment.createMany({
      data: studentIds.map((studentId) => ({
        tenantId: auth.tenantId,
        branchId: structure.branchId,
        studentId,
        structureId,
      })),
      skipDuplicates: true,
    });
    return { assigned: result.count };
  });
}

export async function createFeeAssignment(auth: RequestAuth, input: CreateFeeAssignmentInput) {
  const structure = await getFeeStructureOrThrow(auth, input.structureId);
  assertBranchAccess(auth, structure.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.feeAssignment.findUnique({
      where: { studentId_structureId: { studentId: input.studentId, structureId: input.structureId } },
    });
    if (existing) {
      throw new AppError("CONFLICT", "fee.errors.alreadyAssigned");
    }

    return tx.feeAssignment.create({
      data: {
        tenantId: auth.tenantId,
        branchId: structure.branchId,
        studentId: input.studentId,
        structureId: input.structureId,
      },
    });
  });
}

export async function listFeeAssignments(auth: RequestAuth, query: ListFeeAssignmentsQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.structureId ? { structureId: query.structureId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.feeAssignment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.feeAssignment.count({ where }),
    ]);
    return { items, total };
  });
}

export async function deleteFeeAssignment(auth: RequestAuth, id: string): Promise<void> {
  const assignment = await withTenant(auth.tenantId, (tx) => tx.feeAssignment.findUnique({ where: { id } }));
  if (!assignment) {
    throw new AppError("NOT_FOUND", "fee.errors.assignmentNotFound");
  }
  assertBranchAccess(auth, assignment.branchId);

  await withTenant(auth.tenantId, (tx) => tx.feeAssignment.delete({ where: { id } }));
}

// ---------------------------------------------------------------------------
// Concessions (apply -> approve/reject)
// ---------------------------------------------------------------------------

export async function createConcession(auth: RequestAuth, input: CreateConcessionInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.concession.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: input.studentId,
        type: input.type,
        value: input.value,
        isPercent: input.isPercent,
      },
    })
  );
}

export async function listConcessions(auth: RequestAuth, query: ListConcessionsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.concession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.concession.count({ where }),
    ]);
    return { items, total };
  });
}

async function getConcessionOrThrow(auth: RequestAuth, id: string) {
  const concession = await withTenant(auth.tenantId, (tx) => tx.concession.findUnique({ where: { id } }));
  if (!concession) {
    throw new AppError("NOT_FOUND", "fee.errors.concessionNotFound");
  }
  return concession;
}

export async function getConcession(auth: RequestAuth, id: string) {
  return getConcessionOrThrow(auth, id);
}

export async function patchConcession(auth: RequestAuth, id: string, input: PatchConcessionInput) {
  const concession = await getConcessionOrThrow(auth, id);
  assertBranchAccess(auth, concession.branchId);
  if (concession.status !== "PENDING") {
    throw new AppError("CONFLICT", "fee.errors.concessionNotPending");
  }

  return withTenant(auth.tenantId, (tx) => tx.concession.update({ where: { id }, data: input }));
}

export async function decideConcession(auth: RequestAuth, id: string, input: DecideConcessionInput) {
  const concession = await getConcessionOrThrow(auth, id);
  assertBranchAccess(auth, concession.branchId);
  if (concession.status !== "PENDING") {
    throw new AppError("CONFLICT", "fee.errors.concessionNotPending");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.concession.update({
      where: { id },
      data: { status: input.status, approvedById: auth.userId },
    })
  );
}
