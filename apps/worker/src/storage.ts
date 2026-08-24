import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Own S3 client, not shared with apps/api's core/storage.ts (invariant #9:
// jobs sit behind their own interface, no cross-app imports) — same env
// vars, same bucket, just a second small client instance.
const client = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  },
});

/** Server-generated PDFs (receipts/report cards/certificates/ID cards) upload directly — no presigned-URL round trip needed since the worker holds the bytes already. */
export async function putObjectBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
  await client.send(
    new PutObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await client.send(
    new GetObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key })
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Object "${key}" has no body`);
  }
  return Buffer.from(bytes);
}
