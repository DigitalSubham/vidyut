import { withTenant, type Prisma } from "@vidyut/db";
import type { CreateSurveyInput, RespondSurveyInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createSurvey(auth: RequestAuth, input: CreateSurveyInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.survey.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        title: input.title,
        audience: input.audience as Prisma.InputJsonValue | undefined,
        isPoll: input.isPoll,
        createdById: auth.userId,
        questions: {
          create: input.questions.map((q) => ({
            tenantId: auth.tenantId,
            questionText: q.questionText,
            type: q.type,
            options: q.options as Prisma.InputJsonValue | undefined,
            order: q.order,
          })),
        },
      },
      include: { questions: true },
    })
  );
}

export async function listSurveysForBranch(auth: RequestAuth, branchId: string) {
  assertBranchAccess(auth, branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.survey.findMany({ where: { branchId }, include: { questions: true }, orderBy: { createdAt: "desc" } })
  );
}

async function getSurveyOrThrow(auth: RequestAuth, id: string) {
  const survey = await withTenant(auth.tenantId, (tx) =>
    tx.survey.findUnique({ where: { id }, include: { questions: true } })
  );
  if (!survey) {
    throw new AppError("NOT_FOUND", "engagement.errors.surveyNotFound");
  }
  return survey;
}

/** No branch/permission gate — responding is open to any authenticated user, matching how ack-ing a circular works. One response per question per user, enforced by the DB unique constraint (a resubmit updates, not duplicates). */
export async function respondSurvey(auth: RequestAuth, surveyId: string, input: RespondSurveyInput) {
  const survey = await getSurveyOrThrow(auth, surveyId);
  const questionIds = new Set(survey.questions.map((q) => q.id));
  for (const answer of input.answers) {
    if (!questionIds.has(answer.questionId)) {
      throw new AppError("VALIDATION_ERROR", "engagement.errors.questionNotInSurvey");
    }
  }

  return withTenant(auth.tenantId, (tx) =>
    Promise.all(
      input.answers.map((a) =>
        tx.surveyResponse.upsert({
          where: { questionId_respondedByUserId: { questionId: a.questionId, respondedByUserId: auth.userId } },
          create: {
            tenantId: auth.tenantId,
            questionId: a.questionId,
            respondedByUserId: auth.userId,
            answer: a.answer,
          },
          update: { answer: a.answer },
        })
      )
    )
  );
}

/** Staff results view — a tally per option for SINGLE_CHOICE questions, the raw list of responses for TEXT. */
export async function getSurveyResults(auth: RequestAuth, surveyId: string) {
  const survey = await getSurveyOrThrow(auth, surveyId);
  assertBranchAccess(auth, survey.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const results = await Promise.all(
      survey.questions.map(async (q) => {
        const responses = await tx.surveyResponse.findMany({ where: { questionId: q.id } });
        if (q.type === "SINGLE_CHOICE") {
          const tally: Record<string, number> = {};
          for (const option of (q.options as string[] | null) ?? []) {
            tally[option] = 0;
          }
          for (const r of responses) {
            tally[r.answer] = (tally[r.answer] ?? 0) + 1;
          }
          return { questionId: q.id, questionText: q.questionText, type: q.type, tally };
        }
        return {
          questionId: q.id,
          questionText: q.questionText,
          type: q.type,
          responses: responses.map((r) => r.answer),
        };
      })
    );
    return results;
  });
}
