import { z } from "zod";

export const createHomeworkSchema = z.object({
  branchId: z.string().min(1, "homework.errors.branchRequired"),
  sectionId: z.string().min(1, "homework.errors.sectionRequired"),
  subjectId: z.string().min(1, "homework.errors.subjectRequired"),
  title: z.string().trim().min(1, "homework.errors.titleRequired"),
  description: z.string().trim().min(1, "homework.errors.descriptionRequired"),
  attachmentUrl: z.string().url().optional(),
  dueDate: z.coerce.date(),
});
export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;

export const patchHomeworkSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  attachmentUrl: z.string().url().optional(),
  dueDate: z.coerce.date().optional(),
});
export type PatchHomeworkInput = z.infer<typeof patchHomeworkSchema>;

export const listHomeworkQuerySchema = z.object({
  sectionId: z.string().min(1, "homework.errors.sectionRequired"),
  subjectId: z.string().min(1).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  // Delta sync (Unit 32) — see attendance's identical since= param.
  since: z.coerce.date().optional(),
});
export type ListHomeworkQueryInput = z.infer<typeof listHomeworkQuerySchema>;

// -- Unit 45: submissions + grading -------------------------------------------

export const requestHomeworkSubmissionUploadSchema = z.object({
  studentId: z.string().min(1, "homework.errors.studentRequired"),
  fileName: z.string().trim().min(1, "homework.errors.fileNameRequired"),
  contentType: z.string().trim().min(1, "homework.errors.contentTypeRequired"),
});
export type RequestHomeworkSubmissionUploadInput = z.infer<typeof requestHomeworkSubmissionUploadSchema>;

export const gradeHomeworkSubmissionSchema = z.object({
  grade: z.string().trim().min(1, "homework.errors.gradeRequired"),
  feedback: z.string().trim().min(1).optional(),
});
export type GradeHomeworkSubmissionInput = z.infer<typeof gradeHomeworkSubmissionSchema>;

// -- Unit 45: calendar (reuses /me's studentId self-scope, but grouped by month) --

export const myHomeworkCalendarQuerySchema = z.object({
  studentId: z.string().min(1, "me.errors.studentRequired"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
export type MyHomeworkCalendarQueryInput = z.infer<typeof myHomeworkCalendarQuerySchema>;
