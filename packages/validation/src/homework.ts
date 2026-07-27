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
