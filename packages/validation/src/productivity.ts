import { z } from "zod";

// --- Unit 65: Misc Engagement & Productivity Tools ---

export const createStaffTaskSchema = z.object({
  branchId: z.string().min(1, "productivity.errors.branchRequired"),
  assignedToId: z.string().min(1, "productivity.errors.assignedToRequired"),
  title: z.string().trim().min(1, "productivity.errors.titleRequired"),
  dueDate: z.coerce.date().optional(),
});
export type CreateStaffTaskInput = z.infer<typeof createStaffTaskSchema>;

export const listStaffTasksQuerySchema = z.object({
  branchId: z.string().min(1, "productivity.errors.branchRequired"),
  assignedToId: z.string().min(1).optional(),
});
export type ListStaffTasksQueryInput = z.infer<typeof listStaffTasksQuerySchema>;
