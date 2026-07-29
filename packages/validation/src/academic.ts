import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const createSessionSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const patchSessionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional(),
});
export type PatchSessionInput = z.infer<typeof patchSessionSchema>;

export const listSessionsQuerySchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  ...pagination,
});
export type ListSessionsQueryInput = z.infer<typeof listSessionsQuerySchema>;

export const createClassSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  order: z.coerce.number().int(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const patchClassSchema = z.object({
  name: z.string().trim().min(1).optional(),
  order: z.coerce.number().int().optional(),
});
export type PatchClassInput = z.infer<typeof patchClassSchema>;

export const listClassesQuerySchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  ...pagination,
});
export type ListClassesQueryInput = z.infer<typeof listClassesQuerySchema>;

export const createSectionSchema = z.object({
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  capacity: z.coerce.number().int().min(1).optional(),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const patchSectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  // Unit 09 — Staff exists now, so a section's class-teacher can be set.
  classTeacherId: z.string().min(1).nullable().optional(),
});
export type PatchSectionInput = z.infer<typeof patchSectionSchema>;

export const listSectionsQuerySchema = z.object(pagination);
export type ListSectionsQueryInput = z.infer<typeof listSectionsQuerySchema>;

const subjectTypeValues = ["CORE", "ELECTIVE", "CO_SCHOLASTIC", "PRACTICAL"] as const;

export const createSubjectSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  code: z.string().trim().min(1, "academic.errors.codeRequired"),
  type: z.enum(subjectTypeValues).default("CORE"),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const patchSubjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1).optional(),
  type: z.enum(subjectTypeValues).optional(),
});
export type PatchSubjectInput = z.infer<typeof patchSubjectSchema>;

export const listSubjectsQuerySchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  ...pagination,
});
export type ListSubjectsQueryInput = z.infer<typeof listSubjectsQuerySchema>;

export const createClassSubjectSchema = z.object({
  subjectId: z.string().min(1, "academic.errors.subjectRequired"),
  isElective: z.boolean().default(false),
});
export type CreateClassSubjectInput = z.infer<typeof createClassSubjectSchema>;

// --- Unit 33: Academic-Year Rollover ---

export const rolloverPreviewSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  fromSessionId: z.string().min(1, "academic.errors.sessionRequired"),
  toSessionId: z.string().min(1, "academic.errors.sessionRequired"),
});
export type RolloverPreviewInput = z.infer<typeof rolloverPreviewSchema>;

const rolloverActionValues = ["PROMOTE", "REPEAT", "WITHDRAW"] as const;

const rolloverDecisionSchema = z
  .object({
    studentId: z.string().min(1, "academic.errors.studentRequired"),
    action: z.enum(rolloverActionValues),
    targetClassId: z.string().min(1).optional(),
    targetSectionId: z.string().min(1).optional(),
  })
  .refine((d) => d.action === "WITHDRAW" || (d.targetClassId && d.targetSectionId), {
    message: "academic.errors.rolloverTargetRequired",
    path: ["targetClassId"],
  });

export const rolloverCommitSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  fromSessionId: z.string().min(1, "academic.errors.sessionRequired"),
  toSessionId: z.string().min(1, "academic.errors.sessionRequired"),
  decisions: z.array(rolloverDecisionSchema).min(1, "academic.errors.rolloverDecisionsRequired"),
});
export type RolloverCommitInput = z.infer<typeof rolloverCommitSchema>;

// --- Unit 36: Branch management ---

const boardValues = ["CBSE", "ICSE", "STATE_BIHAR", "OTHER"] as const;

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  code: z.string().trim().min(1, "academic.errors.branchCodeRequired"),
  address: z.string().trim().min(1).optional(),
  board: z.enum(boardValues).default("CBSE"),
  logoUrl: z.string().trim().url().optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const patchBranchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  board: z.enum(boardValues).optional(),
  logoUrl: z.string().trim().url().optional(),
  isActive: z.boolean().optional(),
});
export type PatchBranchInput = z.infer<typeof patchBranchSchema>;

export const listBranchesQuerySchema = z.object({
  ...pagination,
});
export type ListBranchesQueryInput = z.infer<typeof listBranchesQuerySchema>;

// --- Unit 43: Academic Structure Depth (electives, houses) ---

export const createElectiveGroupSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  classId: z.string().min(1, "academic.errors.classRequired"),
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
});
export type CreateElectiveGroupInput = z.infer<typeof createElectiveGroupSchema>;

export const listElectiveGroupsQuerySchema = z.object({
  classId: z.string().min(1, "academic.errors.classRequired"),
});
export type ListElectiveGroupsQueryInput = z.infer<typeof listElectiveGroupsQuerySchema>;

export const addElectiveOptionSchema = z.object({
  classSubjectId: z.string().min(1, "academic.errors.subjectRequired"),
});
export type AddElectiveOptionInput = z.infer<typeof addElectiveOptionSchema>;

export const chooseElectiveSchema = z.object({
  studentId: z.string().min(1, "student.errors.studentRequired"),
  classSubjectId: z.string().min(1, "academic.errors.subjectRequired"),
});
export type ChooseElectiveInput = z.infer<typeof chooseElectiveSchema>;

export const createHouseSchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
  name: z.string().trim().min(1, "academic.errors.nameRequired"),
  color: z.string().trim().min(1).optional(),
});
export type CreateHouseInput = z.infer<typeof createHouseSchema>;

export const listHousesQuerySchema = z.object({
  branchId: z.string().min(1, "academic.errors.branchRequired"),
});
export type ListHousesQueryInput = z.infer<typeof listHousesQuerySchema>;
