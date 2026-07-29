import { Router } from "express";
import {
  createGuardianSchema,
  inviteGuardianSchema,
  linkGuardianSchema,
  listGuardiansQuerySchema,
  patchGuardianSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

/** Mounted at /api/v1/guardians. */
export const guardiansRouter = Router();

guardiansRouter.use(authGuard, tenantContext);

guardiansRouter.post(
  "/",
  requirePermission("guardian.manage"),
  validateBody(createGuardianSchema),
  asyncHandler(controller.createGuardian)
);

guardiansRouter.get(
  "/",
  requirePermission("guardian.manage"),
  validateQuery(listGuardiansQuerySchema),
  asyncHandler(controller.listGuardians)
);

// Registered before "/:id" — self-scoped (any PARENT), not gated by
// guardian.manage, and would otherwise be shadowed by the "/:id" route.
guardiansRouter.get("/me/children", asyncHandler(controller.getMyChildren));

guardiansRouter.get("/:id", requirePermission("guardian.manage"), asyncHandler(controller.getGuardian));

guardiansRouter.patch(
  "/:id",
  requirePermission("guardian.manage"),
  validateBody(patchGuardianSchema),
  asyncHandler(controller.patchGuardian)
);

guardiansRouter.post(
  "/:id/invite",
  requirePermission("guardian.manage"),
  validateBody(inviteGuardianSchema),
  asyncHandler(controller.inviteGuardian)
);

/** Mounted at /api/v1/students — student<->guardian linking lives here, not in modules/students. */
export const studentGuardiansRouter = Router();

studentGuardiansRouter.use(authGuard, tenantContext);

studentGuardiansRouter.post(
  "/:studentId/guardians",
  requirePermission("guardian.manage"),
  validateBody(linkGuardianSchema),
  asyncHandler(controller.linkGuardian)
);

studentGuardiansRouter.delete(
  "/:studentId/guardians/:guardianId",
  requirePermission("guardian.manage"),
  asyncHandler(controller.unlinkGuardian)
);
