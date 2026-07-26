import { SignJWT, jwtVerify } from "jose";
import type { AccessTokenClaims, RefreshTokenClaims } from "@vidyut/types";
import { config } from "../config";

const accessSecret = new TextEncoder().encode(config.jwt.accessSecret);
const refreshSecret = new TextEncoder().encode(config.jwt.refreshSecret);

export async function signAccessToken(claims: Omit<AccessTokenClaims, "type">): Promise<string> {
  return new SignJWT({ ...claims, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${config.jwt.accessTtlSeconds}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, accessSecret);
  if (payload.type !== "access") {
    throw new Error("Not an access token");
  }
  return payload as unknown as AccessTokenClaims;
}

export async function signRefreshToken(claims: Omit<RefreshTokenClaims, "type">): Promise<string> {
  return new SignJWT({ ...claims, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(`${config.jwt.refreshTtlSeconds}s`)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (payload.type !== "refresh") {
    throw new Error("Not a refresh token");
  }
  return payload as unknown as RefreshTokenClaims;
}
