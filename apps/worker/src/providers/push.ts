import type { SendResult } from "./types";

/**
 * FCM legacy HTTP API (server-key auth, matching the simple `FCM_SERVER_KEY`
 * env var this unit's spec names — the newer HTTP v1 API needs a service-
 * account OAuth flow, a bigger lift not justified until this is confirmed
 * as the real integration path). Gated on `pushToken` existing at all
 * (`User.pushToken`, new this unit) — no token means no device is
 * registered, a real "can't send" signal distinct from "not configured."
 */
export async function sendPush(pushToken: string | null, title: string, body: string): Promise<SendResult> {
  if (!pushToken) {
    // eslint-disable-next-line no-console
    console.log(`[worker] PUSH skipped (stub, no device token registered): ${title} — ${body}`);
    return { sent: false, stubbed: true };
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    // eslint-disable-next-line no-console
    console.log(`[worker] PUSH to device (stub, no FCM_SERVER_KEY configured): ${title} — ${body}`);
    return { sent: false, stubbed: true };
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `key=${serverKey}` },
      body: JSON.stringify({ to: pushToken, notification: { title, body } }),
    });
    if (!res.ok) {
      return { sent: false, stubbed: false, error: `FCM responded ${res.status}` };
    }
    const result = (await res.json().catch(() => ({}))) as { multicast_id?: number; success?: number };
    if (!result.success) {
      return { sent: false, stubbed: false, error: "FCM reported 0 successful deliveries" };
    }
    return { sent: true, stubbed: false, providerRef: String(result.multicast_id) };
  } catch (error) {
    return { sent: false, stubbed: false, error: error instanceof Error ? error.message : String(error) };
  }
}
