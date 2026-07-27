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
