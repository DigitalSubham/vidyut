import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

// -- Exam timetable ------------------------------------------------------------

export const createExamTimetableSchema = z.object({
  subjectId: z.string().min(1, "exam.errors.subjectRequired"),
  date: z.coerce.date(),
  startTime: z.string().trim().min(1, "exam.errors.startTimeRequired"),
  room: z.string().trim().min(1).optional(),
});
export type CreateExamTimetableInput = z.infer<typeof createExamTimetableSchema>;

// -- Co-scholastic grades --------------------------------------------------------

export const coScholasticGradeEntrySchema = z.object({
  studentId: z.string().min(1, "exam.errors.studentRequired"),
  activity: z.string().trim().min(1, "exam.errors.activityRequired"),
  grade: z.string().trim().min(1, "exam.errors.gradeRequired"),
});

export const bulkEnterCoScholasticGradesSchema = z.object({
  entries: z.array(coScholasticGradeEntrySchema).min(1, "exam.errors.entriesRequired"),
});
export type BulkEnterCoScholasticGradesInput = z.infer<typeof bulkEnterCoScholasticGradesSchema>;

// -- Question bank ---------------------------------------------------------------

export const createQuestionBankItemSchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  classId: z.string().min(1, "exam.errors.classRequired"),
  subjectId: z.string().min(1, "exam.errors.subjectRequired"),
  questionText: z.string().trim().min(1, "exam.errors.questionTextRequired"),
  options: z.array(z.string().trim().min(1)).min(2, "exam.errors.optionsMinTwo"),
  correctOptionIndex: z.coerce.number().int().min(0),
});
export type CreateQuestionBankItemInput = z.infer<typeof createQuestionBankItemSchema>;

export const listQuestionBankQuerySchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  classId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  ...pagination,
});
export type ListQuestionBankQueryInput = z.infer<typeof listQuestionBankQuerySchema>;

// -- Online exams (MCQ-only, Open Question 1) ------------------------------------

export const createOnlineExamSchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  classId: z.string().min(1, "exam.errors.classRequired"),
  subjectId: z.string().min(1, "exam.errors.subjectRequired"),
  title: z.string().trim().min(1, "exam.errors.titleRequired"),
  durationMinutes: z.coerce.number().int().min(1, "exam.errors.durationRequired"),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});
export type CreateOnlineExamInput = z.infer<typeof createOnlineExamSchema>;

export const listOnlineExamsQuerySchema = z.object({
  branchId: z.string().min(1, "exam.errors.branchRequired"),
  classId: z.string().min(1).optional(),
  ...pagination,
});
export type ListOnlineExamsQueryInput = z.infer<typeof listOnlineExamsQuerySchema>;

export const addOnlineExamQuestionSchema = z.object({
  questionText: z.string().trim().min(1, "exam.errors.questionTextRequired"),
  options: z.array(z.string().trim().min(1)).min(2, "exam.errors.optionsMinTwo"),
  correctOptionIndex: z.coerce.number().int().min(0),
  marks: z.coerce.number().int().min(1).default(1),
});
export type AddOnlineExamQuestionInput = z.infer<typeof addOnlineExamQuestionSchema>;

export const addOnlineExamQuestionFromBankSchema = z.object({
  questionBankItemId: z.string().min(1, "exam.errors.questionBankItemRequired"),
  marks: z.coerce.number().int().min(1).default(1),
});
export type AddOnlineExamQuestionFromBankInput = z.infer<typeof addOnlineExamQuestionFromBankSchema>;

export const takeOnlineExamQuerySchema = z.object({
  studentId: z.string().min(1, "me.errors.studentRequired"),
});
export type TakeOnlineExamQueryInput = z.infer<typeof takeOnlineExamQuerySchema>;

export const submitOnlineExamSchema = z.object({
  studentId: z.string().min(1, "me.errors.studentRequired"),
  answers: z.array(z.coerce.number().int().min(0)).min(1, "exam.errors.answersRequired"),
});
export type SubmitOnlineExamInput = z.infer<typeof submitOnlineExamSchema>;
