import { z } from "zod";

const roleKeyValues = ["OWNER", "PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER", "PARENT", "STUDENT"] as const;

export const announcementAudienceSchema = z.object({
  roles: z.array(z.enum(roleKeyValues)).optional(),
  classIds: z.array(z.string().min(1)).optional(),
});
export type AnnouncementAudience = z.infer<typeof announcementAudienceSchema>;

export const createAnnouncementSchema = z.object({
  branchId: z.string().min(1, "announcement.errors.branchRequired"),
  title: z.string().trim().min(1, "announcement.errors.titleRequired"),
  body: z.string().trim().min(1, "announcement.errors.bodyRequired"),
  audience: announcementAudienceSchema.optional(),
  attachmentUrl: z.string().url().optional(),
  // Unit 40 — a one-off future send time; fan-out is delayed, not the row's visibility.
  scheduledFor: z.coerce.date().optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const listAnnouncementsQuerySchema = z.object({
  branchId: z.string().min(1, "announcement.errors.branchRequired"),
});
export type ListAnnouncementsQueryInput = z.infer<typeof listAnnouncementsQuerySchema>;
