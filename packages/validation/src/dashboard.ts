import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  branchId: z.string().min(1, "dashboard.errors.branchRequired"),
});
export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>;
