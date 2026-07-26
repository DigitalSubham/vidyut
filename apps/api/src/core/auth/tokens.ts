import { createHash, randomUUID } from "node:crypto";
import { withTenant } from "@vidyut/db";
import type { RefreshTokenClaims, RoleKey } from "@vidyut/types";
import { config } from "../config";
import { AppError } from "../errors";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface UserAuthContext {
  userId: string;
  tenantId: string;
  roles: RoleKey[];
  branchIds: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Fetches a user's roles + branch memberships fresh (never baked stale into a long-lived token). */
export async function loadUserAuthContext(
  tenantId: string,
  userId: string
): Promise<UserAuthContext> {
  return withTenant(tenantId, async (tx) => {
    const [userRoles, memberships] = await Promise.all([
      tx.userRole.findMany({ where: { userId }, include: { role: true } }),
      tx.branchMembership.findMany({ where: { userId } }),
    ]);

    return {
      userId,
      tenantId,
      roles: [...new Set(userRoles.map((ur) => ur.role.key as RoleKey))],
      branchIds: [...new Set(memberships.map((m) => m.branchId))],
    };
  });
}

/** Issues a fresh access+refresh pair and persists the refresh token (hashed). */
export async function issueTokenPair(ctx: UserAuthContext): Promise<TokenPair> {
  const accessToken = await signAccessToken({
    sub: ctx.userId,
    tenantId: ctx.tenantId,
    roles: ctx.roles,
    branchIds: ctx.branchIds,
  });

  const jti = randomUUID();
  const refreshToken = await signRefreshToken({ sub: ctx.userId, tenantId: ctx.tenantId, jti });
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000);

  await withTenant(ctx.tenantId, (tx) =>
    tx.refreshToken.create({
      data: {
        id: jti,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    })
  );

  return { accessToken, refreshToken };
}

/** Verifies + rotates a refresh token atomically: revokes the old row, creates a new one. */
export async function rotateRefreshToken(presentedToken: string): Promise<TokenPair> {
  let claims: RefreshTokenClaims;
  try {
    claims = await verifyRefreshToken(presentedToken);
  } catch {
    throw new AppError("UNAUTHENTICATED", "auth.errors.invalidRefreshToken");
  }

  const ctx = await loadUserAuthContext(claims.tenantId, claims.sub);
  const accessToken = await signAccessToken({
    sub: ctx.userId,
    tenantId: ctx.tenantId,
    roles: ctx.roles,
    branchIds: ctx.branchIds,
  });

  const newJti = randomUUID();
  const refreshToken = await signRefreshToken({
    sub: ctx.userId,
    tenantId: ctx.tenantId,
    jti: newJti,
  });
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000);
  const presentedHash = hashToken(presentedToken);

  await withTenant(claims.tenantId, async (tx) => {
    const stored = await tx.refreshToken.findUnique({ where: { tokenHash: presentedHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError("UNAUTHENTICATED", "auth.errors.invalidRefreshToken");
    }

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: newJti },
    });

    await tx.refreshToken.create({
      data: {
        id: newJti,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });
  });

  return { accessToken, refreshToken };
}

/** Idempotent: an already-invalid/expired token is treated as "already logged out". */
export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  let claims: RefreshTokenClaims;
  try {
    claims = await verifyRefreshToken(presentedToken);
  } catch {
    return;
  }

  const presentedHash = hashToken(presentedToken);
  await withTenant(claims.tenantId, (tx) =>
    tx.refreshToken.updateMany({
      where: { tokenHash: presentedHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  );
}
