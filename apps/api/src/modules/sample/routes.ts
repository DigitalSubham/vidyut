import { Router } from "express";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateQuery } from "../../core/guards/validate";
import { asyncHandler, ok } from "../../core/envelope";
import { sampleQuerySchema, type SampleQueryInput } from "./schema";

export const sampleRouter = Router();

/**
 * Exists purely to exercise the full pipeline end to end (Unit 04 DoD):
 * auth -> tenant-context -> branch-scope -> RBAC -> Zod -> handler. Not a
 * domain feature — domain modules start at Unit 06.
 */
sampleRouter.get(
  "/protected",
  authGuard,
  tenantContext,
  requireBranch((req) => (typeof req.query.branchId === "string" ? req.query.branchId : undefined)),
  requirePermission("student.view"),
  validateQuery(sampleQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = res.locals.query as SampleQueryInput;
    ok(res, { echo: query.echo ?? null });
  })
);
