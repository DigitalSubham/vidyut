import { z } from "zod";

const markEntryRow = z
  .object({
    studentId: z.string().min(1, "marks.errors.studentRequired"),
    marks: z.coerce.number().int().min(0).optional(),
    isAbsent: z.boolean().default(false),
  })
  .refine((row) => row.isAbsent || row.marks !== undefined, {
    message: "marks.errors.marksRequiredUnlessAbsent",
    path: ["marks"],
  });

export const bulkEnterMarksSchema = z.object({
  examSubjectId: z.string().min(1, "marks.errors.examSubjectRequired"),
  entries: z.array(markEntryRow).min(1, "marks.errors.entriesRequired"),
});
export type BulkEnterMarksInput = z.infer<typeof bulkEnterMarksSchema>;

export const listMarksQuerySchema = z.object({
  examSubjectId: z.string().min(1, "marks.errors.examSubjectRequired"),
  // Delta sync (Unit 32) — see attendance's identical since= param.
  since: z.coerce.date().optional(),
});
export type ListMarksQueryInput = z.infer<typeof listMarksQuerySchema>;
