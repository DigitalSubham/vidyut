import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config";

/**
 * S3-compatible object storage wrapper (R2/S3/MinIO). Used for PDFs/docs by
 * later units — invariant #4: metadata in Postgres, large artifacts here,
 * DB stores only the key/URL. Never stream large blobs through the API
 * process; callers get a signed URL and the client uploads/downloads
 * directly against the bucket.
 */
const client = new S3Client({
  region: config.storage.region,
  endpoint: config.storage.endpoint,
  forcePathStyle: config.storage.forcePathStyle,
  credentials: {
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
  },
});

export async function getUploadUrl(key: string, contentType?: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: config.storage.signedUrlTtlSeconds });
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: config.storage.signedUrlTtlSeconds });
}
