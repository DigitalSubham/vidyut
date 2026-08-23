import { z } from "zod";

// --- Unit 58: Library Management ---

export const createBookSchema = z.object({
  branchId: z.string().min(1, "library.errors.branchRequired"),
  title: z.string().trim().min(1, "library.errors.titleRequired"),
  author: z.string().trim().min(1, "library.errors.authorRequired"),
  isbn: z.string().trim().min(1).optional(),
});
export type CreateBookInput = z.infer<typeof createBookSchema>;

export const listBooksQuerySchema = z.object({
  branchId: z.string().min(1, "library.errors.branchRequired"),
});
export type ListBooksQueryInput = z.infer<typeof listBooksQuerySchema>;

export const createBookCopySchema = z.object({
  barcode: z.string().trim().min(1, "library.errors.barcodeRequired"),
});
export type CreateBookCopyInput = z.infer<typeof createBookCopySchema>;

/** Open Question in scope #2 — exactly one of studentId/staffId, not a new identity. */
export const createLibraryMemberSchema = z
  .object({
    branchId: z.string().min(1, "library.errors.branchRequired"),
    studentId: z.string().min(1).optional(),
    staffId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.studentId) !== Boolean(v.staffId), {
    message: "library.errors.exactlyOneMember",
    path: ["studentId"],
  });
export type CreateLibraryMemberInput = z.infer<typeof createLibraryMemberSchema>;

export const listLibraryMembersQuerySchema = z.object({
  branchId: z.string().min(1, "library.errors.branchRequired"),
});
export type ListLibraryMembersQueryInput = z.infer<typeof listLibraryMembersQuerySchema>;

export const createBookIssueSchema = z.object({
  copyId: z.string().min(1, "library.errors.copyRequired"),
  memberId: z.string().min(1, "library.errors.memberRequired"),
  dueAt: z.coerce.date().optional(),
});
export type CreateBookIssueInput = z.infer<typeof createBookIssueSchema>;

export const listBookIssuesQuerySchema = z.object({
  memberId: z.string().min(1).optional(),
  activeOnly: z.coerce.boolean().optional(),
});
export type ListBookIssuesQueryInput = z.infer<typeof listBookIssuesQuerySchema>;
