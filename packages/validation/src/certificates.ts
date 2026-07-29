import { z } from "zod";

const certificateTypeValues = ["TC", "BONAFIDE", "CHARACTER", "CONDUCT", "ID_CARD", "ADMIT_CARD", "CUSTOM"] as const;

export const issueCertificateSchema = z
  .object({
    studentId: z.string().min(1).optional(),
    staffId: z.string().min(1).optional(),
    type: z.enum(certificateTypeValues),
    customTitle: z.string().trim().min(1).optional(),
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
