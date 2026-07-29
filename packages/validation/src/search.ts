import { z } from "zod";

export const searchQuerySchema = z.object({
  branchId: z.string().min(1, "search.errors.branchRequired"),
  q: z.string().trim().min(1, "search.errors.queryRequired"),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
