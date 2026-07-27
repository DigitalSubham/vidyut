import { Prisma, withTenant } from "@vidyut/db";
import type {
  CreateApplicationInput,
  CreateEnquiryInput,
  ListApplicationsQueryInput,
  ListEnquiriesQueryInput,
  PatchApplicationInput,
  PatchEnquiryInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import * as studentsService from "../students/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export async function createEnquiry(auth: RequestAuth, input: CreateEnquiryInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.enquiry.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        childName: input.childName,
        guardianName: input.guardianName,
        phone: input.phone,
        source: input.source,
        stage: input.stage,
        assignedToId: input.assignedToId,
        followUpAt: input.followUpAt,
      },
    })
  );
}

export async function listEnquiries(auth: RequestAuth, query: ListEnquiriesQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.EnquiryWhereInput = {
      branchId: query.branchId,
      ...(query.stage ? { stage: query.stage } : {}),
    };
    const [items, total] = await Promise.all([
      tx.enquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.enquiry.count({ where }),
    ]);
    return { items, total };
  });
}

async function getEnquiryOrThrow(auth: RequestAuth, id: string) {
  const enquiry = await withTenant(auth.tenantId, (tx) => tx.enquiry.findUnique({ where: { id } }));
  if (!enquiry) {
    throw new AppError("NOT_FOUND", "admission.errors.enquiryNotFound");
  }
  return enquiry;
}

export async function getEnquiry(auth: RequestAuth, id: string) {
  return getEnquiryOrThrow(auth, id);
}

export async function patchEnquiry(auth: RequestAuth, id: string, input: PatchEnquiryInput) {
  const enquiry = await getEnquiryOrThrow(auth, id);
  assertBranchAccess(auth, enquiry.branchId);

  return withTenant(auth.tenantId, (tx) => tx.enquiry.update({ where: { id }, data: input }));
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function createApplication(auth: RequestAuth, input: CreateApplicationInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.application.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        enquiryId: input.enquiryId,
        classAppliedId: input.classAppliedId,
        formData: input.formData as Prisma.InputJsonValue,
        status: input.status,
      },
    })
  );
}

export async function listApplications(auth: RequestAuth, query: ListApplicationsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.ApplicationWhereInput = {
      branchId: query.branchId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      tx.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.application.count({ where }),
    ]);
    return { items, total };
  });
}

async function getApplicationOrThrow(auth: RequestAuth, id: string) {
  const application = await withTenant(auth.tenantId, (tx) => tx.application.findUnique({ where: { id } }));
  if (!application) {
    throw new AppError("NOT_FOUND", "admission.errors.applicationNotFound");
  }
  return application;
}

export async function getApplication(auth: RequestAuth, id: string) {
  return getApplicationOrThrow(auth, id);
}

export async function patchApplication(auth: RequestAuth, id: string, input: PatchApplicationInput) {
  const application = await getApplicationOrThrow(auth, id);
  assertBranchAccess(auth, application.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.application.update({
      where: { id },
      data: { ...input, formData: input.formData as Prisma.InputJsonValue | undefined },
    })
  );
}

/**
 * Converts a confirmed application into a real Student — reuses Unit 07's
 * createStudent (not a duplicate implementation). `sectionId` isn't part of
 * the Application model (data-model.md only tracks classAppliedId), so the
 * front desk supplies it at conversion time, same as a plain student create.
 */
export async function convertApplication(auth: RequestAuth, id: string, sectionId: string) {
  const application = await getApplicationOrThrow(auth, id);
  assertBranchAccess(auth, application.branchId);

  if (application.studentId) {
    throw new AppError("CONFLICT", "admission.errors.alreadyConverted");
  }

  const formData = application.formData as {
    childName: string;
    dob: string;
    guardianName: string;
    guardianPhone: string;
    priorSchool?: string;
  };
  const [firstName, ...rest] = formData.childName.trim().split(/\s+/);

  const student = await studentsService.createStudent(auth, {
    branchId: application.branchId,
    classId: application.classAppliedId,
    sectionId,
    firstName: firstName ?? formData.childName,
    lastName: rest.join(" ") || formData.childName,
    dob: new Date(formData.dob),
    gender: "UNSPECIFIED",
    address: "",
  });

  return withTenant(auth.tenantId, (tx) =>
    tx.application.update({
      where: { id },
      data: { status: "CONFIRMED", studentId: student.id },
    })
  );
}
