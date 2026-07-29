import { z } from "zod";
import { PERMISSIONS } from "@vidyut/types";

/** Unit 36 — custom (non-system) roles only; Role.isSystem rows are immutable. */
export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "roles.errors.nameRequired"),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const patchRolePermissionsSchema = z.object({
  permissions: z.array(z.enum(PERMISSIONS)),
});
export type PatchRolePermissionsInput = z.infer<typeof patchRolePermissionsSchema>;
