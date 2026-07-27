import type { Request, Response, NextFunction } from "express";
import { withTenant } from "@vidyut/db";
import { AppError } from "../errors";
import type { RequestAuth } from "./types";
import "./types";

/**
 * PARENT/STUDENT bypass the permission grid entirely (context/rbac.md rule
 * 5) — they may only touch their own record. `getOwnerUserId` extracts the
 * userId that owns the target resource (e.g. from a loaded Student's linked
 * guardian/user).
 */
export function requireSelf(getOwnerUserId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError("UNAUTHENTICATED", "auth.errors.missingToken"));
      return;
    }

    const isSelfScopedRole = auth.roles.includes("PARENT") || auth.roles.includes("STUDENT");
    if (!isSelfScopedRole) {
      // Staff/owner roles are gated by requirePermission() instead.
      next();
      return;
    }

    const ownerUserId = getOwnerUserId(req);
    if (ownerUserId !== auth.userId) {
      next(new AppError("FORBIDDEN", "auth.errors.selfScopeForbidden"));
      return;
    }

    next();
  };
}

/**
 * The richer self-scope Unit 03 deferred: given an authenticated PARENT's
 * userId, returns every studentId they're linked to via
 * Guardian.userId -> StudentGuardian (context/feature-specs/08-parents-
 * guardians.md). Later units' parent-facing endpoints (attendance, fees,
 * report cards) call this instead of the direct self-userId check above.
 */
export async function resolveGuardianStudentIds(tenantId: string, userId: string): Promise<string[]> {
  return withTenant(tenantId, async (tx) => {
    const guardian = await tx.guardian.findFirst({ where: { userId } });
    if (!guardian) {
      return [];
    }
    const links = await tx.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  });
}

/**
 * Unit 24's generic self-scope layer — every parent/student `/me` endpoint
 * calls this once instead of resolving its own bespoke check. For a STUDENT
 * token (Unit 24's optional `Student.userId` direct login), returns just
 * that student's own id; for a PARENT token, delegates to the existing
 * guardian resolver above. Anything else returns an empty list (no access).
 */
export async function resolveSelfStudentIds(auth: RequestAuth): Promise<string[]> {
  if (auth.roles.includes("STUDENT")) {
    const student = await withTenant(auth.tenantId, (tx) => tx.student.findFirst({ where: { userId: auth.userId } }));
    return student ? [student.id] : [];
  }
  if (auth.roles.includes("PARENT")) {
    return resolveGuardianStudentIds(auth.tenantId, auth.userId);
  }
  return [];
}
