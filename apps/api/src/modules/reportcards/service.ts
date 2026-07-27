import { Prisma, withTenant } from "@vidyut/db";
import type {
  CreateReportCardTemplateInput,
  GenerateReportCardsInput,
  ListReportCardTemplatesQueryInput,
  ListReportCardsQueryInput,
  PatchReportCardTemplateInput,
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

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function createTemplate(auth: RequestAuth, input: CreateReportCardTemplateInput) {
  if (input.branchId) {
    assertBranchAccess(auth, input.branchId);
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCardTemplate.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        name: input.name,
        board: input.board,
        layout: input.layout as Prisma.InputJsonValue,
      },
    })
  );
}

export async function listTemplates(auth: RequestAuth, query: ListReportCardTemplatesQueryInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.reportCardTemplate.findMany({
      where: { deletedAt: null, ...(query.branchId ? { OR: [{ branchId: query.branchId }, { branchId: null }] } : {}) },
      orderBy: { createdAt: "desc" },
    })
  );
}

async function getTemplateOrThrow(auth: RequestAuth, id: string) {
  const template = await withTenant(auth.tenantId, (tx) => tx.reportCardTemplate.findUnique({ where: { id } }));
  if (!template || template.deletedAt) {
    throw new AppError("NOT_FOUND", "reportcard.errors.templateNotFound");
  }
  return template;
}

export async function patchTemplate(auth: RequestAuth, id: string, input: PatchReportCardTemplateInput) {
  const template = await getTemplateOrThrow(auth, id);
  if (template.branchId) {
    assertBranchAccess(auth, template.branchId);
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCardTemplate.update({
      where: { id },
      data: { ...input, layout: input.layout as Prisma.InputJsonValue | undefined },
    })
  );
}

export async function deleteTemplate(auth: RequestAuth, id: string): Promise<void> {
  const template = await getTemplateOrThrow(auth, id);
  if (template.branchId) {
    assertBranchAccess(auth, template.branchId);
  }

  await withTenant(auth.tenantId, (tx) =>
    tx.reportCardTemplate.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

// ---------------------------------------------------------------------------
// Report cards
// ---------------------------------------------------------------------------

export async function generateReportCards(auth: RequestAuth, input: GenerateReportCardsInput) {
  const exam = await withTenant(auth.tenantId, (tx) => tx.exam.findUnique({ where: { id: input.examId } }));
  if (!exam || exam.deletedAt) {
    throw new AppError("NOT_FOUND", "exam.errors.examNotFound");
  }
  assertBranchAccess(auth, exam.branchId);

  const template = await getTemplateOrThrow(auth, input.templateId);
  if (template.branchId && template.branchId !== exam.branchId) {
    throw new AppError("VALIDATION_ERROR", "reportcard.errors.templateNotFoundInBranch");
  }

  const studentIds =
    input.studentIds ??
    (await withTenant(auth.tenantId, async (tx) => {
      const examSubjects = await tx.examSubject.findMany({ where: { examId: input.examId } });
      const classIds = [...new Set(examSubjects.map((es) => es.classId))];
      const enrollments = await tx.enrollment.findMany({
        where: { sessionId: exam.sessionId, classId: { in: classIds } },
      });
      return [...new Set(enrollments.map((e) => e.studentId))];
    }));

  const reportCards = await withTenant(auth.tenantId, async (tx) => {
    const created = [];
    for (const studentId of studentIds) {
      const row = await tx.reportCard.upsert({
        where: { examId_studentId: { examId: input.examId, studentId } },
        create: {
          tenantId: auth.tenantId,
          branchId: exam.branchId,
          sessionId: exam.sessionId,
          studentId,
          examId: input.examId,
          templateId: input.templateId,
        },
        update: { templateId: input.templateId },
      });
      created.push(row);
    }
    return created;
  });

  for (const reportCard of reportCards) {
    await enqueue("reportcard.generate", { reportCardId: reportCard.id });
  }

  return reportCards;
}

export async function listReportCards(auth: RequestAuth, query: ListReportCardsQueryInput) {
  const exam = await withTenant(auth.tenantId, (tx) => tx.exam.findUnique({ where: { id: query.examId } }));
  if (!exam || exam.deletedAt) {
    throw new AppError("NOT_FOUND", "exam.errors.examNotFound");
  }
  assertBranchAccess(auth, exam.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCard.findMany({ where: { examId: query.examId }, orderBy: { createdAt: "asc" } })
  );
}

export async function publishReportCard(auth: RequestAuth, id: string) {
  const reportCard = await withTenant(auth.tenantId, (tx) => tx.reportCard.findUnique({ where: { id } }));
  if (!reportCard) {
    throw new AppError("NOT_FOUND", "reportcard.errors.reportCardNotFound");
  }
  assertBranchAccess(auth, reportCard.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.reportCard.update({ where: { id }, data: { publishedAt: new Date() } })
  );
}
