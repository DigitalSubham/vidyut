import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import type { SendResult } from "./types";

/**
 * AWS SES v2, gated on `SES_FROM_ADDRESS` (region/credentials reuse the
 * standard AWS SDK credential chain, same as `apps/api/src/core/storage.ts`
 * for S3 — no separate SES-specific key env vars needed on real AWS infra).
 * Plain text only (Out of scope: rich HTML templates).
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const from = process.env.SES_FROM_ADDRESS;

  if (!from) {
    // eslint-disable-next-line no-console
    console.log(`[worker] email to ${to} (stub, no SES_FROM_ADDRESS configured): ${subject}`);
    return { sent: false, stubbed: true };
  }

  try {
    const client = new SESv2Client({ region: process.env.SES_REGION ?? "ap-south-1" });
    const result = await client.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: body } } } },
      })
    );
    return { sent: true, stubbed: false, providerRef: result.MessageId };
  } catch (error) {
    return { sent: false, stubbed: false, error: error instanceof Error ? error.message : String(error) };
  }
}
