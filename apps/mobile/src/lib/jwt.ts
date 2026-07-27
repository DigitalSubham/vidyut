const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Manual base64 decode — `atob`/Buffer aren't reliably available in the RN/Hermes runtime without a polyfill. */
function base64Decode(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

/**
 * Decodes (never verifies — verification is the server's job) a JWT's
 * payload, just enough to read `roles` for client-side routing.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      base64Decode(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
