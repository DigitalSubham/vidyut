/** Hand-rolled base64url decode — mirrors apps/mobile/src/lib/jwt.ts (no atob dependency assumed). */
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
