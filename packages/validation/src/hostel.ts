import { z } from "zod";

// --- Unit 59: Hostel / Dormitory ---

const attendanceStatusValues = ["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY", "HOLIDAY"] as const;
const attendanceSourceValues = ["APP", "WEB", "BIOMETRIC", "IMPORT"] as const;

export const createHostelBlockSchema = z.object({
  branchId: z.string().min(1, "hostel.errors.branchRequired"),
  name: z.string().trim().min(1, "hostel.errors.nameRequired"),
});
export type CreateHostelBlockInput = z.infer<typeof createHostelBlockSchema>;

export const listHostelBlocksQuerySchema = z.object({
  branchId: z.string().min(1, "hostel.errors.branchRequired"),
});
export type ListHostelBlocksQueryInput = z.infer<typeof listHostelBlocksQuerySchema>;

export const createRoomSchema = z.object({
  roomNo: z.string().trim().min(1, "hostel.errors.roomNoRequired"),
  capacity: z.coerce.number().int().positive(),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const listRoomsQuerySchema = z.object({
  blockId: z.string().min(1, "hostel.errors.blockRequired"),
});
export type ListRoomsQueryInput = z.infer<typeof listRoomsQuerySchema>;

/** Scope #3 — `feeAmountPaise` feeds a per-block MISC FeeStructureItem (Unit 11's existing fee engine), not a parallel billing model — same reuse pattern as transport/library. */
export const createRoomAllocationSchema = z.object({
  studentId: z.string().min(1, "hostel.errors.studentRequired"),
  roomId: z.string().min(1, "hostel.errors.roomRequired"),
  fromDate: z.coerce.date(),
  feeAmountPaise: z.coerce.number().int().min(0),
});
export type CreateRoomAllocationInput = z.infer<typeof createRoomAllocationSchema>;

export const listRoomAllocationsQuerySchema = z.object({
  roomId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
});
export type ListRoomAllocationsQueryInput = z.infer<typeof listRoomAllocationsQuerySchema>;

const markHostelAttendanceRecordSchema = z.object({
  studentId: z.string().min(1, "hostel.errors.studentRequired"),
  status: z.enum(attendanceStatusValues),
});

export const markHostelAttendanceSchema = z.object({
  branchId: z.string().min(1, "hostel.errors.branchRequired"),
  date: z.coerce.date(),
  source: z.enum(attendanceSourceValues).default("WEB"),
  records: z.array(markHostelAttendanceRecordSchema).min(1, "hostel.errors.recordsRequired"),
});
export type MarkHostelAttendanceInput = z.infer<typeof markHostelAttendanceSchema>;

export const listHostelAttendanceQuerySchema = z.object({
  branchId: z.string().min(1, "hostel.errors.branchRequired"),
  date: z.coerce.date(),
});
export type ListHostelAttendanceQueryInput = z.infer<typeof listHostelAttendanceQuerySchema>;
