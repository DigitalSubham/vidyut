import type { SendResult } from "./types";

/**
 * MSG91 Flow API (SMS). Gated on `MSG91_API_KEY`/`MSG91_SENDER_ID` — neither
 * exists in this environment yet (`context/prerequisites.md`), so this path
 * has never run against a real MSG91 account. Falls back to the same
 * clearly-logged stub every prior unit used, never a faked success.
 */
export async function sendSms(phone: string, message: string): Promise<SendResult> {
  const apiKey = process.env.MSG91_API_KEY;
  const senderId = process.env.MSG91_SENDER_ID;

  if (!apiKey || !senderId) {
    // eslint-disable-next-line no-console
    console.log(`[worker] SMS to ${phone} (stub, no MSG91 credentials configured): ${message}`);
    return { sent: false, stubbed: true };
  }

  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: apiKey },
      body: JSON.stringify({
        sender: senderId,
        short_url: "0",
        mobiles: phone,
        message,
      }),
    });
    if (!res.ok) {
      return { sent: false, stubbed: false, error: `MSG91 responded ${res.status}` };
    }
    const body = (await res.json().catch(() => ({}))) as { request_id?: string };
    return { sent: true, stubbed: false, providerRef: body.request_id };
  } catch (error) {
    return { sent: false, stubbed: false, error: error instanceof Error ? error.message : String(error) };
  }
}
