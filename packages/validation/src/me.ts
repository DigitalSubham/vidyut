import { z } from "zod";

export const myAttendanceQuerySchema = z.object({
  studentId: z.string().min(1, "me.errors.studentRequired"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
export type MyAttendanceQueryInput = z.infer<typeof myAttendanceQuerySchema>;

export const myStudentScopedQuerySchema = z.object({
  studentId: z.string().min(1, "me.errors.studentRequired"),
});
export type MyStudentScopedQueryInput = z.infer<typeof myStudentScopedQuerySchema>;
