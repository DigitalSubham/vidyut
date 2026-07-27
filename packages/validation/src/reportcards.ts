import { z } from "zod";

const boardValues = ["CBSE", "ICSE", "STATE_BIHAR", "OTHER"] as const;

export const createReportCardTemplateSchema = z.object({
  branchId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "reportcard.errors.nameRequired"),
  board: z.enum(boardValues),
  layout: z.record(z.string(), z.unknown()).default({}),
});
export type CreateReportCardTemplateInput = z.infer<typeof createReportCardTemplateSchema>;

export const patchReportCardTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  board: z.enum(boardValues).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
});
export type PatchReportCardTemplateInput = z.infer<typeof patchReportCardTemplateSchema>;

export const listReportCardTemplatesQuerySchema = z.object({
  branchId: z.string().min(1).optional(),
});
export type ListReportCardTemplatesQueryInput = z.infer<typeof listReportCardTemplatesQuerySchema>;

export const generateReportCardsSchema = z.object({
  examId: z.string().min(1, "reportcard.errors.examRequired"),
  templateId: z.string().min(1, "reportcard.errors.templateRequired"),
  studentIds: z.array(z.string().min(1)).optional(),
});
export type GenerateReportCardsInput = z.infer<typeof generateReportCardsSchema>;

export const listReportCardsQuerySchema = z.object({
  examId: z.string().min(1, "reportcard.errors.examRequired"),
});
export type ListReportCardsQueryInput = z.infer<typeof listReportCardsQuerySchema>;
