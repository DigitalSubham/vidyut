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

// --- Unit 56: Super-Admin Console Depth ---

/** No tenantId body field — targeting is `targetPlanKeys` (omitted/empty = every ACTIVE tenant), resolved server-side by the fanout job, never a client-picked tenant list. */
export const createGlobalAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "platform.errors.titleRequired"),
  body: z.string().trim().min(1, "platform.errors.bodyRequired"),
  targetPlanKeys: z.array(z.enum(PLAN_KEYS)).optional(),
});
export type CreateGlobalAnnouncementInput = z.infer<typeof createGlobalAnnouncementSchema>;

const supportTicketStatusValues = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
const supportTicketPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const;

/** Tenant-side create — no tenantId field, the caller's own `auth.tenantId` is used. */
export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(1, "platform.errors.subjectRequired"),
  body: z.string().trim().min(1, "platform.errors.bodyRequired"),
  priority: z.enum(supportTicketPriorityValues).default("MEDIUM"),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const respondSupportTicketSchema = z.object({
  response: z.string().trim().min(1, "platform.errors.responseRequired"),
  status: z.enum(supportTicketStatusValues).default("RESOLVED"),
});
export type RespondSupportTicketInput = z.infer<typeof respondSupportTicketSchema>;

export const listPlatformTicketsQuerySchema = z.object({
  status: z.enum(supportTicketStatusValues).optional(),
});

/** Unit 69 scope #5 — reuses SupportTicket with type: FEEDBACK; `category` folds into `subject`, no dedicated column. */
export const createFeedbackSchema = z.object({
  category: z.string().trim().min(1, "platform.errors.categoryRequired"),
  body: z.string().trim().min(1, "platform.errors.bodyRequired"),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

/** Unit 69 scope #7 — the white-label branding fields Unit 31's app-config pipeline already reads. */
export const patchTenantBrandingSchema = z.object({
  logoUrl: z.string().url("platform.errors.invalidUrl").optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "platform.errors.invalidColor")
    .optional(),
  customDomain: z.string().trim().min(1).optional(),
});
export type PatchTenantBrandingInput = z.infer<typeof patchTenantBrandingSchema>;
export type ListPlatformTicketsQueryInput = z.infer<typeof listPlatformTicketsQuerySchema>;
