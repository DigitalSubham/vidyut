import { z } from "zod";

export const sampleQuerySchema = z.object({
  branchId: z.string().optional(),
  echo: z.string().max(10, "sample.errors.echoTooLong").optional(),
});
export type SampleQueryInput = z.infer<typeof sampleQuerySchema>;
