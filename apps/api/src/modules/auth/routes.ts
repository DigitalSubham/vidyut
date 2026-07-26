import { Router } from "express";
import {
  logoutSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  staffLoginSchema,
  twoFaVerifySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { validateBody } from "../../core/guards/validate";
import * as controller from "./controller";

export const authRouter = Router();

authRouter.post(
  "/otp/request",
  validateBody(otpRequestSchema),
  asyncHandler(controller.requestOtp)
);

authRouter.post(
  "/otp/verify",
  validateBody(otpVerifySchema),
  asyncHandler(controller.verifyOtp)
);

authRouter.post("/login", validateBody(staffLoginSchema), asyncHandler(controller.login));

authRouter.post(
  "/2fa/verify",
  validateBody(twoFaVerifySchema),
  asyncHandler(controller.verifyTwoFa)
);

authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(controller.refresh));

authRouter.post("/logout", validateBody(logoutSchema), asyncHandler(controller.logout));
