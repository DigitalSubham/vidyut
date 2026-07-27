import { withTenant } from "@vidyut/db";
import type { CreateHomeworkInput, ListHomeworkQueryInput, PatchHomeworkInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getStaffByUserId } from "../staff/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

/** A TEACHER may only post homework for a section they're assigned to teach; PRINCIPAL isn't section-restricted. */
async function assertCanManageSection(auth: RequestAuth, sectionId: string): Promise<void> {
  if (auth.roles.includes("PRINCIPAL")) {
    return;
  }

  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    throw new AppError("FORBIDDEN", "auth.errors.missingPermission");
  }

  const assigned = await withTenant(auth.tenantId, (tx) =>
    tx.teacherAssignment.findFirst({ where: { sectionId, staffId: staff.id } })
  );
  const isClassTeacher = await withTenant(auth.tenantId, (tx) =>
    tx.section.findFirst({ where: { id: sectionId, classTeacherId: staff.id } })
  );
  if (!assigned && !isClassTeacher) {
    throw new AppError("FORBIDDEN", "auth.errors.sectionForbidden");
  }
}

async function getHomeworkOrThrow(auth: RequestAuth, id: string) {
  const homework = await withTenant(auth.tenantId, (tx) => tx.homework.findUnique({ where: { id } }));
  if (!homework) {
    throw new AppError("NOT_FOUND", "homework.errors.notFound");
  }
  return homework;
}

export async function createHomework(auth: RequestAuth, input: CreateHomeworkInput) {
  assertBranchAccess(auth, input.branchId);
  await assertCanManageSection(auth, input.sectionId);

  return withTenant(auth.tenantId, (tx) =>
    tx.homework.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        title: input.title,
        description: input.description,
        attachmentUrl: input.attachmentUrl,
        dueDate: input.dueDate,
        createdById: auth.userId,
      },
    })
  );
}

export async function listHomework(auth: RequestAuth, query: ListHomeworkQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: query.sectionId } });
    if (!section) {
      throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
    }
    assertBranchAccess(auth, section.branchId);

    return tx.homework.findMany({
      where: {
        sectionId: query.sectionId,
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.dueBefore || query.dueAfter
          ? {
              dueDate: {
                ...(query.dueBefore ? { lte: query.dueBefore } : {}),
                ...(query.dueAfter ? { gte: query.dueAfter } : {}),
              },
            }
          : {}),
        ...(query.since ? { updatedAt: { gte: query.since } } : {}),
      },
      orderBy: { dueDate: "asc" },
    });
  });
}

export async function patchHomework(auth: RequestAuth, id: string, input: PatchHomeworkInput) {
  const homework = await getHomeworkOrThrow(auth, id);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  return withTenant(auth.tenantId, (tx) => tx.homework.update({ where: { id }, data: input }));
}

export async function deleteHomework(auth: RequestAuth, id: string): Promise<void> {
  const homework = await getHomeworkOrThrow(auth, id);
  assertBranchAccess(auth, homework.branchId);
  await assertCanManageSection(auth, homework.sectionId);

  await withTenant(auth.tenantId, (tx) => tx.homework.delete({ where: { id } }));
}
