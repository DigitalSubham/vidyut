function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  redisUrl: requireEnv("REDIS_URL"),
  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    accessTtlSeconds: 15 * 60,
    refreshTtlSeconds: 30 * 24 * 60 * 60,
    // Separate secret for platform (super-admin) tokens — a leaked tenant
    // token must never verify as a platform token, and vice versa.
    platformSecret: requireEnv("JWT_PLATFORM_SECRET"),
    platformAccessTtlSeconds: 15 * 60,
  },
  otp: {
    codeTtlSeconds: 5 * 60,
    maxRequestsPerWindow: 3,
    requestWindowSeconds: 10 * 60,
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT, // unset in prod: real S3/R2 resolves via region + default AWS endpoint
    region: process.env.S3_REGION ?? "auto",
    bucket: requireEnv("S3_BUCKET"),
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    signedUrlTtlSeconds: 15 * 60,
  },
};
