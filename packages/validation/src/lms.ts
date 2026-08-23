import { z } from "zod";

export const createSyllabusChapterSchema = z.object({
  branchId: z.string().min(1, "lms.errors.branchRequired"),
  subjectId: z.string().min(1, "lms.errors.subjectRequired"),
  classId: z.string().min(1, "lms.errors.classRequired"),
  title: z.string().trim().min(1, "lms.errors.titleRequired"),
  order: z.coerce.number().int(),
});
export type CreateSyllabusChapterInput = z.infer<typeof createSyllabusChapterSchema>;

export const listSyllabusChaptersQuerySchema = z.object({
  subjectId: z.string().min(1, "lms.errors.subjectRequired"),
  classId: z.string().min(1, "lms.errors.classRequired"),
});
export type ListSyllabusChaptersQueryInput = z.infer<typeof listSyllabusChaptersQuerySchema>;

export const createLessonPlanSchema = z.object({
  branchId: z.string().min(1, "lms.errors.branchRequired"),
  subjectId: z.string().min(1, "lms.errors.subjectRequired"),
  sectionId: z.string().min(1, "lms.errors.sectionRequired"),
  date: z.coerce.date(),
  topic: z.string().trim().min(1, "lms.errors.topicRequired"),
  notes: z.string().trim().min(1).optional(),
});
export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;

export const listLessonPlansQuerySchema = z.object({
  sectionId: z.string().min(1, "lms.errors.sectionRequired"),
  subjectId: z.string().min(1).optional(),
});
export type ListLessonPlansQueryInput = z.infer<typeof listLessonPlansQuerySchema>;

export const createContentItemSchema = z
  .object({
    branchId: z.string().min(1, "lms.errors.branchRequired"),
    subjectId: z.string().min(1, "lms.errors.subjectRequired"),
    classId: z.string().min(1, "lms.errors.classRequired"),
    title: z.string().trim().min(1, "lms.errors.titleRequired"),
    type: z.enum(["FILE", "LINK"]),
    fileUrl: z.string().url().optional(),
    linkUrl: z.string().url().optional(),
  })
  .refine((v) => (v.type === "FILE" ? !!v.fileUrl : !!v.linkUrl), {
    message: "lms.errors.urlRequiredForType",
    path: ["fileUrl"],
  });
export type CreateContentItemInput = z.infer<typeof createContentItemSchema>;

export const listContentItemsQuerySchema = z.object({
  subjectId: z.string().min(1, "lms.errors.subjectRequired"),
  classId: z.string().min(1, "lms.errors.classRequired"),
});
export type ListContentItemsQueryInput = z.infer<typeof listContentItemsQuerySchema>;

export const createLiveClassLinkSchema = z.object({
  branchId: z.string().min(1, "lms.errors.branchRequired"),
  sectionId: z.string().min(1, "lms.errors.sectionRequired"),
  subjectId: z.string().min(1, "lms.errors.subjectRequired"),
  startTime: z.coerce.date(),
  joinUrl: z.string().url("lms.errors.joinUrlInvalid"),
});
export type CreateLiveClassLinkInput = z.infer<typeof createLiveClassLinkSchema>;

export const listLiveClassLinksQuerySchema = z.object({
  sectionId: z.string().min(1, "lms.errors.sectionRequired"),
});
export type ListLiveClassLinksQueryInput = z.infer<typeof listLiveClassLinksQuerySchema>;
