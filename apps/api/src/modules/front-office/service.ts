import { withTenant } from "@vidyut/db";
import type {
  CheckInVisitorInput,
  CreateCallLogEntryInput,
  CreateComplaintDeskEntryInput,
  CreateGatePassInput,
  CreatePostalLogEntryInput,
  ResolveComplaintDeskEntryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { enqueue } from "../../core/jobs";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function checkInVisitor(auth: RequestAuth, input: CheckInVisitorInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.visitor.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        name: input.name,
        purpose: input.purpose,
        hostStaffId: input.hostStaffId,
        photoUrl: input.photoUrl,
      },
    })
  );
}

export async function checkOutVisitor(auth: RequestAuth, visitorId: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const visitor = await tx.visitor.findUnique({ where: { id: visitorId } });
    if (!visitor) {
      throw new AppError("NOT_FOUND", "frontoffice.errors.visitorNotFound");
    }
    assertBranchAccess(auth, visitor.branchId);
    if (visitor.checkOutAt) {
      throw new AppError("VALIDATION_ERROR", "frontoffice.errors.alreadyCheckedOut");
    }
    return tx.visitor.update({ where: { id: visitorId }, data: { checkOutAt: new Date() } });
  });
}

export async function listVisitors(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.visitor.findMany({ where: { branchId }, orderBy: { checkInAt: "desc" } })
  );
}

/** Scope #2 — approval alone triggers the parent alert, reusing the existing PUSH-then-SMS-fallback pipeline (Unit 32/40), no new dispatch logic. */
export async function createGatePass(auth: RequestAuth, input: CreateGatePassInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, async (tx) => {
    const gatePass = await tx.gatePass.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        studentId: input.studentId,
        reason: input.reason,
        approvedById: auth.userId,
      },
    });

    await enqueue("frontoffice.gatePassAlert", {
      tenantId: auth.tenantId,
      branchId: input.branchId,
      studentId: input.studentId,
      gatePassId: gatePass.id,
      reason: input.reason,
    });

    return gatePass;
  });
}

export async function exitGatePass(auth: RequestAuth, gatePassId: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const gatePass = await tx.gatePass.findUnique({ where: { id: gatePassId } });
    if (!gatePass) {
      throw new AppError("NOT_FOUND", "frontoffice.errors.gatePassNotFound");
    }
    assertBranchAccess(auth, gatePass.branchId);
    return tx.gatePass.update({ where: { id: gatePassId }, data: { exitAt: new Date() } });
  });
}

export async function listGatePasses(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.gatePass.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } })
  );
}

export async function createComplaintDeskEntry(auth: RequestAuth, input: CreateComplaintDeskEntryInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.complaintDeskEntry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        raisedByName: input.raisedByName,
        category: input.category,
        body: input.body,
      },
    })
  );
}

export async function resolveComplaintDeskEntry(auth: RequestAuth, id: string, input: ResolveComplaintDeskEntryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const entry = await tx.complaintDeskEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new AppError("NOT_FOUND", "frontoffice.errors.complaintNotFound");
    }
    assertBranchAccess(auth, entry.branchId);
    return tx.complaintDeskEntry.update({
      where: { id },
      data: { status: "RESOLVED", resolution: input.resolution, resolvedById: auth.userId, resolvedAt: new Date() },
    });
  });
}

export async function listComplaintDeskEntries(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.complaintDeskEntry.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } })
  );
}

export async function createCallLogEntry(auth: RequestAuth, input: CreateCallLogEntryInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.callLogEntry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        direction: input.direction,
        callerName: input.callerName,
        phone: input.phone,
        notes: input.notes,
      },
    })
  );
}

export async function listCallLogEntries(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.callLogEntry.findMany({ where: { branchId }, orderBy: { calledAt: "desc" } })
  );
}

export async function createPostalLogEntry(auth: RequestAuth, input: CreatePostalLogEntryInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.postalLogEntry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        direction: input.direction,
        refNo: input.refNo,
        description: input.description,
      },
    })
  );
}

export async function listPostalLogEntries(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.postalLogEntry.findMany({ where: { branchId }, orderBy: { loggedAt: "desc" } })
  );
}
