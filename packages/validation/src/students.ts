import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const studentStatusValues = ["ACTIVE", "INACTIVE", "TC_ISSUED", "ALUMNI", "STRUCK_OFF"] as const;

export const createStudentSchema = z.object({
  branchId: z.string().min(1, "student.errors.branchRequired"),
  classId: z.string().min(1, "student.errors.classRequired"),
  sectionId: z.string().min(1, "student.errors.sectionRequired"),
  sessionId: z.string().min(1).optional(),
  admissionNo: z.string().trim().min(1).optional(),
  rollNo: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1, "student.errors.firstNameRequired"),
  lastName: z.string().trim().min(1, "student.errors.lastNameRequired"),
  dob: z.coerce.date(),
  gender: z.string().trim().min(1, "student.errors.genderRequired"),
  bloodGroup: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  religion: z.string().trim().min(1).optional(),
  photoUrl: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1, "student.errors.addressRequired"),
  customFields: z.record(z.unknown()).optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const patchStudentSchema = z.object({
  rollNo: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  dob: z.coerce.date().optional(),
  gender: z.string().trim().min(1).optional(),
  bloodGroup: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  religion: z.string().trim().min(1).optional(),
  photoUrl: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  status: z.enum(studentStatusValues).optional(),
  customFields: z.record(z.unknown()).optional(),
  // Unit 43 — simple house tagging.
  houseId: z.string().min(1).nullable().optional(),
});
export type PatchStudentInput = z.infer<typeof patchStudentSchema>;

export const listStudentsQuerySchema = z.object({
  branchId: z.string().min(1, "student.errors.branchRequired"),
  classId: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional(),
  status: z.enum(studentStatusValues).optional(),
  search: z.string().trim().min(1).optional(),
  ...pagination,
});
export type ListStudentsQueryInput = z.infer<typeof listStudentsQuerySchema>;

export const requestImportUploadSchema = z.object({
  branchId: z.string().min(1, "student.errors.branchRequired"),
  fileName: z.string().trim().min(1, "student.errors.fileNameRequired"),
  contentType: z.string().trim().min(1).optional(),
});
export type RequestImportUploadInput = z.infer<typeof requestImportUploadSchema>;

export const importStudentsSchema = z.object({
  branchId: z.string().min(1, "student.errors.branchRequired"),
  fileKey: z.string().trim().min(1, "student.errors.fileKeyRequired"),
});
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>;

/** One row of the bulk import sheet — className/sectionName are resolved to
 * IDs by the worker (context/feature-specs/07's Decisions: staff filling in
 * a spreadsheet don't know internal Class/Section IDs). */
export const importStudentRowSchema = z.object({
  className: z.string().trim().min(1, "student.errors.classRequired"),
  sectionName: z.string().trim().min(1, "student.errors.sectionRequired"),
  admissionNo: z.string().trim().min(1).optional(),
  rollNo: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1, "student.errors.firstNameRequired"),
  lastName: z.string().trim().min(1, "student.errors.lastNameRequired"),
  dob: z.coerce.date(),
  gender: z.string().trim().min(1, "student.errors.genderRequired"),
  bloodGroup: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  religion: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1, "student.errors.addressRequired"),
});
export type ImportStudentRowInput = z.infer<typeof importStudentRowSchema>;

// --- Unit 66: Student Lifecycle Depth ---

/** Open Question 2 — history stays put; this moves the student + updates the current-session Enrollment in place (Enrollment's @@unique([studentId, sessionId]) rules out a second row for the same session). */
export const transferStudentSchema = z.object({
  targetBranchId: z.string().min(1, "student.errors.branchRequired"),
  targetClassId: z.string().min(1, "student.errors.classRequired"),
  targetSectionId: z.string().min(1, "student.errors.sectionRequired"),
});
export type TransferStudentInput = z.infer<typeof transferStudentSchema>;

/** Open Question 3 — distinct from Unit 33's rollover-time REPEAT. */
export const readmitStudentSchema = z.object({
  classId: z.string().min(1, "student.errors.classRequired"),
  sectionId: z.string().min(1, "student.errors.sectionRequired"),
});
export type ReadmitStudentInput = z.infer<typeof readmitStudentSchema>;

export const listAlumniQuerySchema = z.object({
  branchId: z.string().min(1, "student.errors.branchRequired"),
  ...pagination,
});
export type ListAlumniQueryInput = z.infer<typeof listAlumniQuerySchema>;

/** Open Question 1 — a plain tag, not an auto-discount trigger. */
export const linkSiblingsSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(2, "student.errors.siblingsMinTwo"),
});
export type LinkSiblingsInput = z.infer<typeof linkSiblingsSchema>;

const studentTimelineTypeValues = ["DISCIPLINE", "ACHIEVEMENT", "NOTE"] as const;

export const createTimelineEntrySchema = z.object({
  type: z.enum(studentTimelineTypeValues),
  body: z.string().trim().min(1, "student.errors.timelineBodyRequired"),
  occurredAt: z.coerce.date().optional(),
});
export type CreateTimelineEntryInput = z.infer<typeof createTimelineEntrySchema>;
