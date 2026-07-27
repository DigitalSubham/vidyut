import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { decodeJwtPayload } from "./jwt";
import { clearSession, loadSession, saveSession, type StoredSession } from "./secure-tokens";

interface AccessTokenClaims {
  roles?: string[];
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
