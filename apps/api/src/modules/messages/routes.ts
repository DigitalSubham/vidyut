import { Router } from "express";
import { listMessagesQuerySchema, sendMessageSchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const messagesRouter = Router();

messagesRouter.use(authGuard, tenantContext);

// No requireBranch/requirePermission — self-scope is enforced inside the
// service (the caller must be the staff or guardian side of the
// conversation, or staff with branch access for moderation).
messagesRouter.post("/", validateBody(sendMessageSchema), asyncHandler(controller.sendMessage));
messagesRouter.get("/", validateQuery(listMessagesQuerySchema), asyncHandler(controller.listThread));
messagesRouter.get("/threads/mine", asyncHandler(controller.listMyThreads));
