import { z } from "zod";

const certificateTypeValues = ["TC", "BONAFIDE", "CHARACTER", "CONDUCT", "ID_CARD", "ADMIT_CARD", "CUSTOM"] as const;

export const issueCertificateSchema = z
  .object({
    studentId: z.string().min(1, "certificate.errors.studentRequired"),
    type: z.enum(certificateTypeValues),
    customTitle: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.type !== "CUSTOM" || !!data.customTitle, {
    message: "certificate.errors.customTitleRequired",
    path: ["customTitle"],
  });
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;

export const listCertificatesQuerySchema = z.object({
  branchId: z.string().min(1, "certificate.errors.branchRequired"),
  studentId: z.string().min(1).optional(),
  type: z.enum(certificateTypeValues).optional(),
});
export type ListCertificatesQueryInput = z.infer<typeof listCertificatesQuerySchema>;
