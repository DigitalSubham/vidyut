import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { decodeJwtPayload } from "./jwt";
import { refreshAccessToken } from "./api-client";
import { clearSession, loadSession, saveSession, type StoredSession } from "./secure-tokens";

interface AccessTokenClaims {
  roles?: string[];
  /** Standard JWT expiry claim, seconds since epoch. */
  exp?: number;
}

interface AuthState {
  isLoading: boolean;
  session: StoredSession | null;
  roles: string[];
  login(session: StoredSession): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .finally(() => setIsLoading(false));
  }, []);

  const roles = useMemo(() => {
    if (!session) return [];
    const claims = decodeJwtPayload<AccessTokenClaims>(session.accessToken);
    return claims?.roles ?? [];
  }, [session]);

  /**
   * Access tokens are short-lived (15 min — apps/api/src/core/config.ts's
   * JWT TTL) and, until now, nothing ever refreshed one: every screen's
   * data-loading (e.g. ParentStudentHomeScreen's loadSection) has no error
   * handling at all, so an expired token made every request silently fail
   * with zero visible symptom beyond "the screen never shows any data".
   * Refreshes proactively ~60s before expiry, from the token's own `exp`
   * claim, rather than reacting to a 401 — so in-flight screens never even
   * see a failed request in the first place.
   */
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!session) return;

    const claims = decodeJwtPayload<AccessTokenClaims>(session.accessToken);
    if (!claims?.exp) return;

    const msUntilExpiry = claims.exp * 1000 - Date.now();
    const msUntilRefresh = Math.max(0, msUntilExpiry - 60_000);

    refreshTimer.current = setTimeout(() => {
      refreshAccessToken(session.refreshToken)
        .then(async (tokens) => {
          const nextSession = { ...session, ...tokens };
          await saveSession(nextSession);
          setSession(nextSession);
        })
        .catch(() => {
          // Refresh token itself expired/was revoked — nothing to silently
          // fix here; the next real request 401s and the user re-logs in,
          // same fallback behavior as before this proactive refresh existed.
        });
    }, msUntilRefresh);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      session,
      roles,
      async login(newSession) {
        await saveSession(newSession);
        setSession(newSession);
      },
      async logout() {
        await clearSession();
        setSession(null);
      },
    }),
    [isLoading, session, roles]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
