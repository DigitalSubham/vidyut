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
  // Unit 44 — period-wise attendance. Omitted/undefined means daily attendance.
  periodId: z.string().min(1).optional(),
  source: z.enum(attendanceSourceValues).default("WEB"),
  records: z.array(markAttendanceRecordSchema).min(1, "attendance.errors.recordsRequired"),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const listAttendanceQuerySchema = z.object({
  branchId: z.string().min(1, "attendance.errors.branchRequired"),
  sectionId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  periodId: z.string().min(1).optional(),
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

// -- Unit 44: generic device-scan ingestion (biometric/RFID) ------------------
// Vendor-agnostic: a device authenticates with a per-branch token (not a user
// JWT — see context/feature-specs/44's Open Question 1) and reports a scan
// for one student. The actual ESSL/Mantra/etc. integration is the user's to
// wire against this shape once a vendor is chosen.
export const deviceScanSchema = z.object({
  deviceToken: z.string().min(1, "attendance.errors.deviceTokenRequired"),
  admissionNo: z.string().min(1, "attendance.errors.admissionNoRequired"),
  timestamp: z.coerce.date().optional(),
  status: z.enum(attendanceStatusValues).default("PRESENT"),
});
export type DeviceScanInput = z.infer<typeof deviceScanSchema>;

// -- Unit 44: attendance analytics --------------------------------------------
export const attendanceAnalyticsQuerySchema = z.object({
  branchId: z.string().min(1, "attendance.errors.branchRequired"),
  classId: z.string().min(1).optional(),
  from: z.coerce.date(),
  to: z.coerce.date(),
  minAbsences: z.coerce.number().int().min(1).default(3),
});
export type AttendanceAnalyticsQueryInput = z.infer<typeof attendanceAnalyticsQuerySchema>;
