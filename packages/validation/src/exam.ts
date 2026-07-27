import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const examTypeValues = ["UNIT_TEST", "HALF_YEARLY", "ANNUAL", "PRE_BOARD", "PRACTICAL"] as const;
const gradingSchemeValues = ["MARKS", "PERCENTAGE", "GRADE", "CCE", "CGPA"] as const;

export const createExamSchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  sessionId: z.string().min(1, "exam.errors.sessionRequired"),
  name: z.string().trim().min(1, "exam.errors.nameRequired"),
  type: z.enum(examTypeValues),
  gradingScheme: z.enum(gradingSchemeValues),
  startDate: z.coerce.date().optional(),
});
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const patchExamSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(examTypeValues).optional(),
  gradingScheme: z.enum(gradingSchemeValues).optional(),
  startDate: z.coerce.date().optional(),
  isLocked: z.boolean().optional(),
});
export type PatchExamInput = z.infer<typeof patchExamSchema>;

export const listExamsQuerySchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  sessionId: z.string().min(1).optional(),
  ...pagination,
});
export type ListExamsQueryInput = z.infer<typeof listExamsQuerySchema>;

export const createExamSubjectSchema = z
  .object({
    classId: z.string().min(1, "exam.errors.classRequired"),
    subjectId: z.string().min(1, "exam.errors.subjectRequired"),
    maxMarks: z.coerce.number().int().min(1, "exam.errors.maxMarksInvalid"),
    passMarks: z.coerce.number().int().min(0, "exam.errors.passMarksInvalid"),
    weightage: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => data.passMarks <= data.maxMarks, {
    message: "exam.errors.passMarksExceedsMax",
    path: ["passMarks"],
  });
export type CreateExamSubjectInput = z.infer<typeof createExamSubjectSchema>;
