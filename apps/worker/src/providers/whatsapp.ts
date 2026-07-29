import type { SendResult } from "./types";

/**
 * Gupshup WhatsApp template-message API. Gated on `GUPSHUP_API_KEY`/
 * `GUPSHUP_SOURCE_NUMBER` — neither exists in this environment yet. Template
 * messages only (Out of scope: interactive/button messages) — matches what
 * DLT approval typically covers first, per this unit's own scope-down.
 */
export async function sendWhatsapp(phone: string, message: string): Promise<SendResult> {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const source = process.env.GUPSHUP_SOURCE_NUMBER;

  if (!apiKey || !source) {
    // eslint-disable-next-line no-console
    console.log(`[worker] WhatsApp to ${phone} (stub, no Gupshup credentials configured): ${message}`);
    return { sent: false, stubbed: true };
  }

  try {
    const res = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: apiKey,
      },
      body: new URLSearchParams({
        channel: "whatsapp",
        source,
        destination: phone,
        message: JSON.stringify({ type: "text", text: message }),
      }),
    });
    if (!res.ok) {
      return { sent: false, stubbed: false, error: `Gupshup responded ${res.status}` };
    }
    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { sent: true, stubbed: false, providerRef: body.messageId };
  } catch (error) {
    return { sent: false, stubbed: false, error: error instanceof Error ? error.message : String(error) };
  }
}
