import type { RoleKey } from "./roles";

/** JWT claims — context/api-conventions.md (Auth). */
export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  roles: RoleKey[];
  branchIds: string[];
  type: "access";
}

export interface RefreshTokenClaims {
  sub: string;
  tenantId: string;
  /** Identifies the stored (hashed) refresh-token row this JWT corresponds to. */
  jti: string;
  type: "refresh";
}

/**
 * Platform (super-admin) auth is a separate context from tenant auth —
 * never carries a tenantId, never goes through withTenant()
 * (context/rbac.md: SUPERADMIN operates across tenants with a separate
 * guard). Signed with a different secret than tenant tokens so a leaked
 * tenant token can never be replayed as a platform token.
 */
export interface PlatformAccessTokenClaims {
  sub: string;
  role: "SUPERADMIN";
  type: "platform_access";
}
