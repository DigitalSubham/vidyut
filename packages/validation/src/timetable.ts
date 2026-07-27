import { z } from "zod";

const timetablePeriodRow = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  periodNo: z.coerce.number().int().min(1),
  subjectId: z.string().min(1, "timetable.errors.subjectRequired"),
  staffId: z.string().min(1, "timetable.errors.staffRequired"),
  room: z.string().trim().min(1).optional(),
});

export const bulkUpsertTimetableSchema = z.object({
  branchId: z.string().min(1, "timetable.errors.branchRequired"),
  sessionId: z.string().min(1, "timetable.errors.sessionRequired"),
  sectionId: z.string().min(1, "timetable.errors.sectionRequired"),
  periods: z.array(timetablePeriodRow).min(1, "timetable.errors.periodsRequired"),
});
export type BulkUpsertTimetableInput = z.infer<typeof bulkUpsertTimetableSchema>;

export const listTimetableQuerySchema = z.object({
  sectionId: z.string().min(1).optional(),
  staffId: z.string().min(1).optional(),
});
export type ListTimetableQueryInput = z.infer<typeof listTimetableQuerySchema>;
