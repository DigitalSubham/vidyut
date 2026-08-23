import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const staffTypeValues = ["TEACHING", "NON_TEACHING"] as const;
const staffRoleValues = ["PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER"] as const;

export const createStaffSchema = z.object({
  branchId: z.string().min(1, "staff.errors.branchRequired"),
  role: z.enum(staffRoleValues),
  email: z.string().trim().email("staff.errors.invalidEmail"),
  password: z.string().min(8, "staff.errors.passwordTooShort"),
  name: z.string().trim().min(1, "staff.errors.nameRequired"),
  employeeNo: z.string().trim().min(1, "staff.errors.employeeNoRequired"),
  designation: z.string().trim().min(1, "staff.errors.designationRequired"),
  type: z.enum(staffTypeValues),
  qualifications: z.string().trim().min(1).optional(),
  joinedAt: z.coerce.date(),
  docs: z.record(z.unknown()).optional(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const patchStaffSchema = z.object({
  designation: z.string().trim().min(1).optional(),
  type: z.enum(staffTypeValues).optional(),
  qualifications: z.string().trim().min(1).optional(),
  docs: z.record(z.unknown()).optional(),
});
export type PatchStaffInput = z.infer<typeof patchStaffSchema>;

export const listStaffQuerySchema = z.object({
  branchId: z.string().min(1, "staff.errors.branchRequired"),
  search: z.string().trim().min(1).optional(),
  ...pagination,
});
export type ListStaffQueryInput = z.infer<typeof listStaffQuerySchema>;

const leaveTypeValues = ["CASUAL", "SICK", "EARNED", "UNPAID", "OTHER"] as const;

export const createLeaveRequestSchema = z.object({
  staffId: z.string().min(1, "staff.errors.staffRequired"),
  type: z.enum(leaveTypeValues),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  halfDay: z.boolean().default(false),
});
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

const leaveDecisionValues = ["APPROVED", "REJECTED"] as const;

export const decideLeaveRequestSchema = z.object({
  status: z.enum(leaveDecisionValues),
});
export type DecideLeaveRequestInput = z.infer<typeof decideLeaveRequestSchema>;

const leaveStatusValues = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

export const listLeaveRequestsQuerySchema = z.object({
  staffId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  status: z.enum(leaveStatusValues).optional(),
  ...pagination,
});
export type ListLeaveRequestsQueryInput = z.infer<typeof listLeaveRequestsQuerySchema>;

export const createTeacherAssignmentSchema = z.object({
  staffId: z.string().min(1, "staff.errors.staffRequired"),
  subjectId: z.string().min(1, "academic.errors.subjectRequired"),
  sectionId: z.string().min(1, "academic.errors.sectionRequired"),
  sessionId: z.string().min(1, "academic.errors.sessionRequired"),
});
export type CreateTeacherAssignmentInput = z.infer<typeof createTeacherAssignmentSchema>;

export const listTeacherAssignmentsQuerySchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  staffId: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  ...pagination,
});
export type ListTeacherAssignmentsQueryInput = z.infer<typeof listTeacherAssignmentsQuerySchema>;

// --- Unit 42: Staff HR Depth ---

export const requestStaffDocumentUploadSchema = z.object({
  label: z.string().trim().min(1, "staff.errors.documentLabelRequired"),
  fileName: z.string().trim().min(1, "staff.errors.fileNameRequired"),
  contentType: z.string().trim().min(1).optional(),
});
export type RequestStaffDocumentUploadInput = z.infer<typeof requestStaffDocumentUploadSchema>;

const staffAttendanceStatusValues = ["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY", "HOLIDAY"] as const;
const staffAttendanceSourceValues = ["APP", "WEB", "BIOMETRIC", "IMPORT"] as const;

export const markStaffAttendanceRecordSchema = z.object({
  staffId: z.string().min(1, "staff.errors.staffRequired"),
  status: z.enum(staffAttendanceStatusValues),
});

export const markStaffAttendanceSchema = z.object({
  branchId: z.string().min(1, "staff.errors.branchRequired"),
  date: z.coerce.date(),
  source: z.enum(staffAttendanceSourceValues).default("WEB"),
  records: z.array(markStaffAttendanceRecordSchema).min(1, "staff.errors.recordsRequired"),
});
export type MarkStaffAttendanceInput = z.infer<typeof markStaffAttendanceSchema>;

export const listStaffAttendanceQuerySchema = z.object({
  branchId: z.string().min(1, "staff.errors.branchRequired"),
  staffId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  ...pagination,
});
export type ListStaffAttendanceQueryInput = z.infer<typeof listStaffAttendanceQuerySchema>;
