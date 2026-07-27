import { z } from "zod";
import { PLAN_KEYS } from "@vidyut/types";

export const platformLoginSchema = z.object({
  email: z.string().trim().email("platform.errors.invalidEmail"),
  password: z.string().min(8, "platform.errors.passwordTooShort"),
});
export type PlatformLoginInput = z.infer<typeof platformLoginSchema>;

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "platform.errors.invalidSlug");

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "platform.errors.nameRequired"),
  slug,
  planKey: z.enum(PLAN_KEYS),
  ownerName: z.string().trim().min(1, "platform.errors.ownerNameRequired"),
  ownerEmail: z.string().trim().email("platform.errors.invalidEmail"),
  ownerPassword: z.string().min(8, "platform.errors.passwordTooShort"),
  branchName: z.string().trim().min(1).optional(),
  branchCode: z.string().trim().min(1).optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

const tenantStatusValues = ["ACTIVE", "SUSPENDED", "TRIAL", "CANCELLED"] as const;

export const patchTenantSchema = z
  .object({
    status: z.enum(tenantStatusValues).optional(),
    planKey: z.enum(PLAN_KEYS).optional(),
    moduleOverride: z
      .object({
        moduleKey: z.string().min(1),
        enabled: z.boolean(),
      })
      .optional(),
  })
  .refine((body) => body.status || body.planKey || body.moduleOverride, {
    message: "platform.errors.emptyPatch",
  });
export type PatchTenantInput = z.infer<typeof patchTenantSchema>;

export const listTenantsQuerySchema = z.object({
  status: z.enum(tenantStatusValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListTenantsQueryInput = z.infer<typeof listTenantsQuerySchema>;

export const impersonateSchema = z.object({
  userId: z.string().min(1, "platform.errors.userIdRequired"),
});
export type ImpersonateInput = z.infer<typeof impersonateSchema>;

export const createPlatformInvoiceSchema = z.object({
  amount: z.coerce.number().int().positive("platform.errors.amountRequired"),
  dueDate: z.coerce.date(),
});
export type CreatePlatformInvoiceInput = z.infer<typeof createPlatformInvoiceSchema>;

const platformInvoiceStatusValues = ["PENDING", "PAID", "OVERDUE"] as const;

export const patchPlatformInvoiceStatusSchema = z.object({
  status: z.enum(platformInvoiceStatusValues),
});
export type PatchPlatformInvoiceStatusInput = z.infer<typeof patchPlatformInvoiceStatusSchema>;

export const walletRechargeSchema = z.object({
  amountPaise: z.coerce.number().int().positive("platform.errors.amountRequired"),
  reason: z.string().trim().min(1, "platform.errors.reasonRequired").default("manual_recharge"),
});
export type WalletRechargeInput = z.infer<typeof walletRechargeSchema>;

export const revenueSummaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type RevenueSummaryQueryInput = z.infer<typeof revenueSummaryQuerySchema>;
