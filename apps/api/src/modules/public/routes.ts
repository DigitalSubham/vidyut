import { Router } from "express";
import { publicCreateEnquirySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { createRateLimiter } from "../../core/rate-limit";
import { validateBody } from "../../core/guards/validate";
import * as controller from "./controller";

export const publicRouter = Router();

/** No auth by design — this is the unauthenticated public site's surface. */

publicRouter.get("/schools/:schoolCode", asyncHandler(controller.getPublicSchoolInfo));

// Stricter than the pipeline-wide default limiter (context/feature-specs/29's
// scope #4) — a public, unauthenticated form is a real spam target.
const publicAdmissionLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  keyPrefix: "public-admission",
});

publicRouter.post(
  "/admissions/:schoolCode",
  publicAdmissionLimiter,
  validateBody(publicCreateEnquirySchema),
  asyncHandler(controller.submitPublicEnquiry)
);
