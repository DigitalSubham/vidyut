import { z } from "zod";

export const demoJobRequestSchema = z.object({
  message: z.string().min(1, "jobs.errors.messageRequired"),
});
export type DemoJobRequestInput = z.infer<typeof demoJobRequestSchema>;
