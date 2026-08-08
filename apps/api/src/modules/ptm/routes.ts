import { Router } from "express";
import { createPTMSlotSchema, listPTMSlotsQuerySchema } from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const ptmRouter = Router();

ptmRouter.use(authGuard, tenantContext);

// No requireBranch/requirePermission — the service resolves the caller's
// own Staff/Guardian record and rejects (403) if they don't have one, which
// is a stronger check than a branch/permission gate for these self-owned
// actions (context/feature-specs/49's PTMSlot scope).
ptmRouter.post("/", validateBody(createPTMSlotSchema), asyncHandler(controller.createSlot));
ptmRouter.get("/", validateQuery(listPTMSlotsQuerySchema), asyncHandler(controller.listSlots));
ptmRouter.patch("/:id/book", asyncHandler(controller.bookSlot));
