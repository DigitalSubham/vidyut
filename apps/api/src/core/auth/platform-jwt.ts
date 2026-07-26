import { SignJWT, jwtVerify } from "jose";
import type { PlatformAccessTokenClaims } from "@vidyut/types";
import { config } from "../config";

const platformSecret = new TextEncoder().encode(config.jwt.platformSecret);

export async function signPlatformAccessToken(
  claims: Omit<PlatformAccessTokenClaims, "type">
): Promise<string> {
  return new SignJWT({ ...claims, type: "platform_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${config.jwt.platformAccessTtlSeconds}s`)
    .sign(platformSecret);
}

export async function verifyPlatformAccessToken(
  token: string
): Promise<PlatformAccessTokenClaims> {
  const { payload } = await jwtVerify(token, platformSecret);
  if (payload.type !== "platform_access") {
    throw new Error("Not a platform access token");
  }
  return payload as unknown as PlatformAccessTokenClaims;
}
