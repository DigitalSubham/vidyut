import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "vidyut.accessToken";
const REFRESH_TOKEN_KEY = "vidyut.refreshToken";
const TENANT_SLUG_KEY = "vidyut.tenantSlug";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  tenantSlug: string;
}

/** Tokens never go in AsyncStorage — always expo-secure-store (Keychain/Keystore-backed). */
export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
  await SecureStore.setItemAsync(TENANT_SLUG_KEY, session.tenantSlug);
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, tenantSlug] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(TENANT_SLUG_KEY),
  ]);
  if (!accessToken || !refreshToken || !tenantSlug) {
    return null;
  }
  return { accessToken, refreshToken, tenantSlug };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(TENANT_SLUG_KEY);
}
