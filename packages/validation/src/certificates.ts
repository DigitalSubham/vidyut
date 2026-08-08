import { z } from "zod";

const certificateTypeValues = ["TC", "BONAFIDE", "CHARACTER", "CONDUCT", "ID_CARD", "ADMIT_CARD", "CUSTOM"] as const;

export const issueCertificateSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    staffId: z.string().min(1).optional(),
    type: z.enum(certificateTypeValues),
    customTitle: z.string().trim().min(1).optional(),
    templateId: z.string().min(1).optional(),
  })
  .refine((data) => data.type !== "CUSTOM" || !!data.customTitle, {
    message: "certificate.errors.customTitleRequired",
    path: ["customTitle"],
  })
  // Unit 42 — exactly one of studentId/staffId, never both/neither.
  .refine((data) => !!data.studentId !== !!data.staffId, {
    message: "certificate.errors.exactlyOneOfStudentOrStaff",
    path: ["studentId"],
  });
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;

export const listCertificatesQuerySchema = z.object({
  branchId: z.string().min(1, "certificate.errors.branchRequired"),
  studentId: z.string().min(1).optional(),
  staffId: z.string().min(1).optional(),
  type: z.enum(certificateTypeValues).optional(),
});
export type ListCertificatesQueryInput = z.infer<typeof listCertificatesQuerySchema>;

// --- Unit 50: Certificates Depth ---

export const createCertificateTemplateSchema = z.object({
  branchId: z.string().min(1).optional(),
  type: z.enum(certificateTypeValues),
  name: z.string().trim().min(1, "certificate.errors.templateNameRequired"),
  body: z.string().trim().min(1, "certificate.errors.templateBodyRequired"),
});
export type CreateCertificateTemplateInput = z.infer<typeof createCertificateTemplateSchema>;

export const listCertificateTemplatesQuerySchema = z.object({
  branchId: z.string().min(1).optional(),
  type: z.enum(certificateTypeValues).optional(),
});
export type ListCertificateTemplatesQueryInput = z.infer<typeof listCertificateTemplatesQuerySchema>;

export const bulkIdsQuerySchema = z.object({
  sectionId: z.string().min(1, "certificate.errors.sectionRequired"),
  templateId: z.string().min(1).optional(),
});
export type BulkIdsQueryInput = z.infer<typeof bulkIdsQuerySchema>;

export const esignWebhookSchema = z.object({
  tenantId: z.string().min(1),
  certificateId: z.string().min(1),
  status: z.enum(["SIGNED"]),
  signedPdfUrl: z.string().min(1),
});
export type EsignWebhookInput = z.infer<typeof esignWebhookSchema>;
