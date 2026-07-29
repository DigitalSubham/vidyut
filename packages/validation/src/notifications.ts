import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

const notifChannelValues = ["PUSH", "SMS", "WHATSAPP", "EMAIL", "IN_APP"] as const;
const notifStatusValues = ["QUEUED", "SENT", "DELIVERED", "FAILED"] as const;

export const listNotificationsQuerySchema = z.object({
  branchId: z.string().min(1, "notification.errors.branchRequired"),
  channel: z.enum(notifChannelValues).optional(),
  status: z.enum(notifStatusValues).optional(),
  ...pagination,
});
export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>;

// --- Unit 40: Notification Templates ---

const templateChannelValues = ["PUSH", "SMS", "WHATSAPP", "EMAIL"] as const;

export const createNotificationTemplateSchema = z.object({
  templateKey: z.string().trim().min(1, "notification.errors.templateKeyRequired"),
  channel: z.enum(templateChannelValues),
  body: z.string().trim().min(1, "notification.errors.bodyRequired"),
  dltId: z.string().trim().min(1).optional(),
});
export type CreateNotificationTemplateInput = z.infer<typeof createNotificationTemplateSchema>;

export const patchNotificationTemplateSchema = z.object({
  body: z.string().trim().min(1).optional(),
  dltId: z.string().trim().min(1).optional(),
});
export type PatchNotificationTemplateInput = z.infer<typeof patchNotificationTemplateSchema>;

// --- Unit 40: In-app inbox ---

export const listMyNotificationsQuerySchema = z.object({
  ...pagination,
});
export type ListMyNotificationsQueryInput = z.infer<typeof listMyNotificationsQuerySchema>;

// --- Unit 40: Push token registration ---

export const registerPushTokenSchema = z.object({
  pushToken: z.string().trim().min(1, "notification.errors.pushTokenRequired"),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
