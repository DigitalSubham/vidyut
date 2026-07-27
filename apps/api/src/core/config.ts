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
  payments: {
    // Real Razorpay integration is stubbed (context/feature-specs/13's
    // Decisions) but signature verification is real and needs a real secret.
    razorpayWebhookSecret: requireEnv("RAZORPAY_WEBHOOK_SECRET"),
    // Basis points (1/100 of a percent); defaults to 0 until a real rate is decided.
    platformFeeBps: Number(process.env.PAYMENT_PLATFORM_FEE_BPS ?? 0),
  },
  notifications: {
    // Placeholder per-SMS cost (context/feature-specs/14's Open Questions) —
    // real pricing is decided later, the wallet-deduction mechanism exists now.
    smsCostPaise: Number(process.env.SMS_COST_PAISE ?? 20),
    reminderDaysBeforeDue: 3,
    reminderRepeatDaysOverdue: 7,
  },
};
