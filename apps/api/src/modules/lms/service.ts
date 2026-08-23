import { withTenant } from "@vidyut/db";
import type {
  CreateContentItemInput,
  CreateLessonPlanInput,
  CreateLiveClassLinkInput,
  CreateSyllabusChapterInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getStaffByUserId } from "../staff/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createSyllabusChapter(auth: RequestAuth, input: CreateSyllabusChapterInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.syllabusChapter.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        subjectId: input.subjectId,
        classId: input.classId,
        title: input.title,
        order: input.order,
      },
    })
  );
}

export async function listSyllabusChapters(auth: RequestAuth, subjectId: string, classId: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const klass = await tx.class.findUnique({ where: { id: classId } });
    if (!klass) {
      throw new AppError("NOT_FOUND", "academic.errors.classNotFound");
    }
    assertBranchAccess(auth, klass.branchId);
    return tx.syllabusChapter.findMany({ where: { subjectId, classId }, orderBy: { order: "asc" } });
  });
}

export async function markSyllabusChapterComplete(auth: RequestAuth, id: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const chapter = await tx.syllabusChapter.findUnique({ where: { id } });
    if (!chapter) {
      throw new AppError("NOT_FOUND", "lms.errors.chapterNotFound");
    }
    assertBranchAccess(auth, chapter.branchId);
    return tx.syllabusChapter.update({ where: { id }, data: { completedAt: new Date() } });
  });
}

export async function createLessonPlan(auth: RequestAuth, input: CreateLessonPlanInput) {
  assertBranchAccess(auth, input.branchId);
  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    throw new AppError("VALIDATION_ERROR", "lms.errors.staffOnly");
  }
  return withTenant(auth.tenantId, (tx) =>
    tx.lessonPlan.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        staffId: staff.id,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        date: input.date,
        topic: input.topic,
        notes: input.notes,
      },
    })
  );
}

export async function listLessonPlans(auth: RequestAuth, sectionId: string, subjectId?: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
    }
    assertBranchAccess(auth, section.branchId);
    return tx.lessonPlan.findMany({
      where: { sectionId, ...(subjectId ? { subjectId } : {}) },
      orderBy: { date: "desc" },
    });
  });
}

export async function createContentItem(auth: RequestAuth, input: CreateContentItemInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.contentItem.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        type: input.type,
        fileUrl: input.fileUrl,
        linkUrl: input.linkUrl,
        subjectId: input.subjectId,
        classId: input.classId,
        createdById: auth.userId,
      },
    })
  );
}

export async function listContentItems(auth: RequestAuth, subjectId: string, classId: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const klass = await tx.class.findUnique({ where: { id: classId } });
    if (!klass) {
      throw new AppError("NOT_FOUND", "academic.errors.classNotFound");
    }
    assertBranchAccess(auth, klass.branchId);
    return tx.contentItem.findMany({ where: { subjectId, classId }, orderBy: { createdAt: "desc" } });
  });
}

export async function createLiveClassLink(auth: RequestAuth, input: CreateLiveClassLinkInput) {
  assertBranchAccess(auth, input.branchId);
  return withTenant(auth.tenantId, (tx) =>
    tx.liveClassLink.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        startTime: input.startTime,
        joinUrl: input.joinUrl,
        createdById: auth.userId,
      },
    })
  );
}

export async function listLiveClassLinks(auth: RequestAuth, sectionId: string) {
  return withTenant(auth.tenantId, async (tx) => {
    const section = await tx.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
    }
    assertBranchAccess(auth, section.branchId);
    return tx.liveClassLink.findMany({ where: { sectionId }, orderBy: { startTime: "asc" } });
  });
}
