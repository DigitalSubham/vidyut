import { z } from "zod";

const notifChannelValues = ["PUSH", "SMS", "WHATSAPP", "EMAIL", "IN_APP"] as const;

export const setCommunicationPreferenceSchema = z.object({
  channel: z.enum(notifChannelValues),
  optedIn: z.boolean(),
});
export type SetCommunicationPreferenceInput = z.infer<typeof setCommunicationPreferenceSchema>;

export const createNewsletterSchema = z.object({
  branchId: z.string().min(1, "newsletter.errors.branchRequired"),
  title: z.string().trim().min(1, "newsletter.errors.titleRequired"),
  body: z.string().trim().min(1, "newsletter.errors.bodyRequired"),
});
export type CreateNewsletterInput = z.infer<typeof createNewsletterSchema>;

export const listNewslettersQuerySchema = z.object({
  branchId: z.string().min(1, "newsletter.errors.branchRequired"),
});
export type ListNewslettersQueryInput = z.infer<typeof listNewslettersQuerySchema>;
