"use client";

import { useEffect } from "react";
import { decodeJwtPayload } from "@/lib/jwt";
import {
  getAdminToken,
  getAdminRefreshToken,
  setAdminToken,
  setAdminRefreshToken,
  clearAdminToken,
  refreshAccessTokenOnce,
  TOKEN_CHANGE_EVENT,
} from "@/lib/admin-client";

interface AccessTokenClaims {
  exp?: number;
}

/**
 * Mounted once at the root (app/layout.tsx) — access tokens are short-lived
 * (15 min, apps/api/src/core/config.ts) and, until now, nothing on the web
 * side ever refreshed one: the refresh token from login was discarded
 * entirely (setAdminToken(accessToken) only, both in the password and 2FA
 * paths), so there was nothing *to* refresh with even reactively. Every 15
 * minutes every request started failing with UNAUTHENTICATED, which read
 * as "logged out" even though nothing explicitly redirected — my own
 * earlier error-handler fix just made that failure visible for the first
 * time ("Your session has expired..."), which is what surfaced this.
 *
 * Schedules a refresh ~60s before the current token's expiry, from its own
 * `exp` claim, so a request in flight rarely even sees a 401 — adminFetch's
 * reactive 401-retry (lib/admin-client.ts) is the safety net for whenever
 * this timer hasn't fired yet (a backgrounded tab, etc.), not the primary
 * mechanism. Listens for TOKEN_CHANGE_EVENT so a login/logout that happens
 * in a differently-mounted component (the login page) reschedules
 * immediately instead of only taking effect on the next full page load.
 */
export function TokenRefresher() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function schedule() {
      clearTimer();
      const token = getAdminToken();
      if (!token) return;

      const claims = decodeJwtPayload<AccessTokenClaims>(token);
      if (!claims?.exp) return;

      const msUntilExpiry = claims.exp * 1000 - Date.now();
      const msUntilRefresh = Math.max(0, msUntilExpiry - 60_000);

      timer = setTimeout(async () => {
        const refreshToken = getAdminRefreshToken();
        if (!refreshToken) return;
        try {
          const tokens = await refreshAccessTokenOnce(refreshToken);
          setAdminToken(tokens.accessToken);
          setAdminRefreshToken(tokens.refreshToken);
          // setAdminToken's own TOKEN_CHANGE_EVENT dispatch re-enters this
          // same handler below and reschedules the next cycle — no need to
          // call schedule() again here directly.
        } catch {
          // Refresh token itself expired/was revoked — no silent recovery
          // possible; clearAdminToken() lets (school)/layout.tsx's own
          // guard redirect to /login on the next render, same fallback as
          // before this refresher existed for that specific edge case.
          clearAdminToken();
        }
      }, msUntilRefresh);
    }

    schedule();
    window.addEventListener(TOKEN_CHANGE_EVENT, schedule);
    return () => {
      clearTimer();
      window.removeEventListener(TOKEN_CHANGE_EVENT, schedule);
    };
  }, []);

  return null;
}
