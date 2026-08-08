import { z } from "zod";

// Unit 49 — Messaging & Engagement. `audience` reuses Announcement's (Unit
// 20) exact shape — {roles?, classIds?} — matched the same way.
const audienceSchema = z
  .object({
    roles: z.array(z.string()).optional(),
    classIds: z.array(z.string()).optional(),
  })
  .optional();

// --- Circulars ---

export const createCircularSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  title: z.string().trim().min(1, "engagement.errors.titleRequired"),
  body: z.string().trim().min(1, "engagement.errors.bodyRequired"),
  attachmentUrl: z.string().trim().min(1).optional(),
  audience: audienceSchema,
});
export type CreateCircularInput = z.infer<typeof createCircularSchema>;

export const listCircularsQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
});
export type ListCircularsQueryInput = z.infer<typeof listCircularsQuerySchema>;

// --- PTM slots ---

// `branchId` isn't accepted from the client — the creating teacher's own
// `Staff.branchId` is used instead (never trust a client-supplied branch for
// a record whose owner is derivable server-side from the session).
export const createPTMSlotSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});
export type CreatePTMSlotInput = z.infer<typeof createPTMSlotSchema>;

export const listPTMSlotsQuerySchema = z.object({
  staffId: z.string().min(1, "engagement.errors.staffRequired"),
  availableOnly: z.coerce.boolean().optional(),
});
export type ListPTMSlotsQueryInput = z.infer<typeof listPTMSlotsQuerySchema>;

// --- Calendar events ---

const calendarEventTypeValues = ["HOLIDAY", "EVENT", "OTHER"] as const;

export const createCalendarEventSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  title: z.string().trim().min(1, "engagement.errors.titleRequired"),
  date: z.coerce.date(),
  type: z.enum(calendarEventTypeValues).default("EVENT"),
  description: z.string().trim().min(1).optional(),
});
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const listCalendarEventsQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
});
export type ListCalendarEventsQueryInput = z.infer<typeof listCalendarEventsQuerySchema>;

export const myCalendarQuerySchema = z.object({
  studentId: z.string().min(1, "engagement.errors.studentRequired"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});
export type MyCalendarQueryInput = z.infer<typeof myCalendarQuerySchema>;

// --- Complaints ---

export const createComplaintSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  category: z.string().trim().min(1, "engagement.errors.categoryRequired"),
  body: z.string().trim().min(1, "engagement.errors.bodyRequired"),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const listComplaintsQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});
export type ListComplaintsQueryInput = z.infer<typeof listComplaintsQuerySchema>;

export const resolveComplaintSchema = z.object({
  resolution: z.string().trim().min(1, "engagement.errors.resolutionRequired"),
});
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;

// --- Surveys ---

const surveyQuestionInput = z.object({
  questionText: z.string().trim().min(1, "engagement.errors.questionTextRequired"),
  type: z.enum(["SINGLE_CHOICE", "TEXT"]),
  options: z.array(z.string().trim().min(1)).optional(),
  order: z.coerce.number().int().min(0),
});

export const createSurveySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  title: z.string().trim().min(1, "engagement.errors.titleRequired"),
  audience: audienceSchema,
  questions: z.array(surveyQuestionInput).min(1, "engagement.errors.questionsRequired"),
});
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;

export const listSurveysQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
});
export type ListSurveysQueryInput = z.infer<typeof listSurveysQuerySchema>;

export const respondSurveySchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().min(1), answer: z.string().trim().min(1) }))
    .min(1, "engagement.errors.answersRequired"),
});
export type RespondSurveyInput = z.infer<typeof respondSurveySchema>;

// --- Gallery ---

export const createGalleryAlbumSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  title: z.string().trim().min(1, "engagement.errors.titleRequired"),
});
export type CreateGalleryAlbumInput = z.infer<typeof createGalleryAlbumSchema>;

export const listGalleryAlbumsQuerySchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
});
export type ListGalleryAlbumsQueryInput = z.infer<typeof listGalleryAlbumsQuerySchema>;

export const requestGalleryPhotoUploadSchema = z.object({
  fileName: z.string().trim().min(1, "engagement.errors.fileNameRequired"),
  contentType: z.string().trim().min(1, "engagement.errors.contentTypeRequired"),
  caption: z.string().trim().min(1).optional(),
});
export type RequestGalleryPhotoUploadInput = z.infer<typeof requestGalleryPhotoUploadSchema>;

// --- Messages (async parent-teacher chat) ---

export const sendMessageSchema = z.object({
  branchId: z.string().min(1, "engagement.errors.branchRequired"),
  staffId: z.string().min(1, "engagement.errors.staffRequired"),
  guardianId: z.string().min(1, "engagement.errors.guardianRequired"),
  body: z.string().trim().min(1, "engagement.errors.bodyRequired"),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listMessagesQuerySchema = z.object({
  staffId: z.string().min(1, "engagement.errors.staffRequired"),
  guardianId: z.string().min(1, "engagement.errors.guardianRequired"),
});
export type ListMessagesQueryInput = z.infer<typeof listMessagesQuerySchema>;
