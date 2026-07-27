import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const attendanceStatusValues = ["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY", "HOLIDAY"] as const;
const attendanceSourceValues = ["APP", "WEB", "BIOMETRIC", "IMPORT"] as const;

export const markAttendanceRecordSchema = z.object({
  id: z.string().min(1).optional(),
  studentId: z.string().min(1, "attendance.errors.studentRequired"),
  status: z.enum(attendanceStatusValues),
});

export const markAttendanceSchema = z.object({
  branchId: z.string().min(1, "attendance.errors.branchRequired"),
  sectionId: z.string().min(1, "attendance.errors.sectionRequired"),
  date: z.coerce.date(),
  source: z.enum(attendanceSourceValues).default("WEB"),
  records: z.array(markAttendanceRecordSchema).min(1, "attendance.errors.recordsRequired"),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const listAttendanceQuerySchema = z.object({
  branchId: z.string().min(1, "attendance.errors.branchRequired"),
  sectionId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  // Delta sync (Unit 32) — returns only rows updated at/after this instant,
  // so a returning-online device doesn't have to re-pull the full roster.
  since: z.coerce.date().optional(),
  ...pagination,
});
export type ListAttendanceQueryInput = z.infer<typeof listAttendanceQuerySchema>;

export const regularizeAttendanceSchema = z.object({
  status: z.enum(attendanceStatusValues),
  reason: z.string().trim().min(1, "attendance.errors.reasonRequired"),
});
export type RegularizeAttendanceInput = z.infer<typeof regularizeAttendanceSchema>;

export const attendanceRegisterQuerySchema = z.object({
  sectionId: z.string().min(1, "attendance.errors.sectionRequired"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
export type AttendanceRegisterQueryInput = z.infer<typeof attendanceRegisterQuerySchema>;

export const attendanceDefaultersQuerySchema = z.object({
  branchId: z.string().min(1, "attendance.errors.branchRequired"),
  classId: z.string().min(1).optional(),
  thresholdPercent: z.coerce.number().min(0).max(100).default(75),
});
export type AttendanceDefaultersQueryInput = z.infer<typeof attendanceDefaultersQuerySchema>;
