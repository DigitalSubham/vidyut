import { z } from "zod";

const documentOwnerTypeValues = ["STUDENT", "STAFF"] as const;

export const requestDocumentUploadSchema = z.object({
  branchId: z.string().min(1, "document.errors.branchRequired"),
  ownerType: z.enum(documentOwnerTypeValues),
  ownerId: z.string().min(1, "document.errors.ownerRequired"),
  label: z.string().trim().min(1, "document.errors.labelRequired"),
  fileName: z.string().trim().min(1, "document.errors.fileNameRequired"),
  contentType: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
});
export type RequestDocumentUploadInput = z.infer<typeof requestDocumentUploadSchema>;

export const listDocumentsQuerySchema = z.object({
  branchId: z.string().min(1, "document.errors.branchRequired"),
  ownerType: z.enum(documentOwnerTypeValues).optional(),
  ownerId: z.string().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});
export type ListDocumentsQueryInput = z.infer<typeof listDocumentsQuerySchema>;
