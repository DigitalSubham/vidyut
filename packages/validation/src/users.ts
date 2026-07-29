import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const staffRoleValues = ["PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER", "CUSTOM"] as const;

/** Unit 36 — POST /users/invite (user.manage). Creates a staff User + Role + branch scope, no Staff HR profile (that's Unit 09's createStaff). */
export const inviteUserSchema = z.object({
  branchId: z.string().min(1, "users.errors.branchRequired"),
  name: z.string().trim().min(1, "users.errors.nameRequired"),
  email: z.string().trim().email("users.errors.invalidEmail"),
  role: z.enum(staffRoleValues),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const patchUserSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  roleKey: z.enum(staffRoleValues).optional(),
  branchId: z.string().min(1).optional(),
});
export type PatchUserInput = z.infer<typeof patchUserSchema>;

export const listUsersQuerySchema = z.object({
  branchId: z.string().min(1, "users.errors.branchRequired"),
  ...pagination,
});
export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;
