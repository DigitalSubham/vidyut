import { z } from "zod";

// --- Unit 60: Front Office & Gate ---

export const checkInVisitorSchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
  name: z.string().trim().min(1, "frontoffice.errors.nameRequired"),
  purpose: z.string().trim().min(1, "frontoffice.errors.purposeRequired"),
  hostStaffId: z.string().min(1).optional(),
  photoUrl: z.string().min(1).optional(),
});
export type CheckInVisitorInput = z.infer<typeof checkInVisitorSchema>;

export const listVisitorsQuerySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
});
export type ListVisitorsQueryInput = z.infer<typeof listVisitorsQuerySchema>;

export const createGatePassSchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
  studentId: z.string().min(1, "frontoffice.errors.studentRequired"),
  reason: z.string().trim().min(1, "frontoffice.errors.reasonRequired"),
});
export type CreateGatePassInput = z.infer<typeof createGatePassSchema>;

export const listGatePassesQuerySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
});
export type ListGatePassesQueryInput = z.infer<typeof listGatePassesQuerySchema>;

export const createComplaintDeskEntrySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
  raisedByName: z.string().trim().min(1, "frontoffice.errors.raisedByNameRequired"),
  category: z.string().trim().min(1, "frontoffice.errors.categoryRequired"),
  body: z.string().trim().min(1, "frontoffice.errors.bodyRequired"),
});
export type CreateComplaintDeskEntryInput = z.infer<typeof createComplaintDeskEntrySchema>;

export const resolveComplaintDeskEntrySchema = z.object({
  resolution: z.string().trim().min(1, "frontoffice.errors.resolutionRequired"),
});
export type ResolveComplaintDeskEntryInput = z.infer<typeof resolveComplaintDeskEntrySchema>;

export const listComplaintDeskEntriesQuerySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
});
export type ListComplaintDeskEntriesQueryInput = z.infer<typeof listComplaintDeskEntriesQuerySchema>;

const callDirectionValues = ["INCOMING", "OUTGOING"] as const;

export const createCallLogEntrySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
  direction: z.enum(callDirectionValues),
  callerName: z.string().trim().min(1, "frontoffice.errors.callerNameRequired"),
  phone: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});
export type CreateCallLogEntryInput = z.infer<typeof createCallLogEntrySchema>;

export const listCallLogEntriesQuerySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
});
export type ListCallLogEntriesQueryInput = z.infer<typeof listCallLogEntriesQuerySchema>;

const postalDirectionValues = ["INWARD", "OUTWARD"] as const;

export const createPostalLogEntrySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
  direction: z.enum(postalDirectionValues),
  refNo: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1, "frontoffice.errors.descriptionRequired"),
});
export type CreatePostalLogEntryInput = z.infer<typeof createPostalLogEntrySchema>;

export const listPostalLogEntriesQuerySchema = z.object({
  branchId: z.string().min(1, "frontoffice.errors.branchRequired"),
});
export type ListPostalLogEntriesQueryInput = z.infer<typeof listPostalLogEntriesQuerySchema>;
