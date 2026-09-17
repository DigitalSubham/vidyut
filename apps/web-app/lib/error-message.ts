import i18next from "./i18n";
import { AdminApiError } from "./admin-client";

/**
 * apps/api's AppError always carries an i18n *key* as its message (e.g.
 * "academic.errors.nameRequired"), never a sentence — every module across
 * the backend follows this same convention, on the assumption some client
 * translates the key. Until now nothing did: this app either showed the
 * raw key verbatim (students/new/page.tsx's `${err.code}: ${err.message}`)
 * or showed nothing at all (every other screen — compounded by sonner's
 * own <Toaster/> never being mounted, see app/layout.tsx).
 *
 * Translating every individual backend error key properly (there are
 * hundreds, spread across 70+ API modules) is a much bigger job than "add
 * error handling." Instead: a clean, fully-translated headline per error
 * *code* — a small, fixed set (see apps/api's AppError call sites) — with
 * the specific validation reason(s) as supporting detail, humanized from
 * their key form rather than shown as a raw dotted string.
 */
const ERROR_CODE_MESSAGE_KEY: Record<string, string> = {
  VALIDATION_ERROR: "platform.errors.validation",
  NOT_FOUND: "platform.errors.notFound",
  UNAUTHENTICATED: "platform.errors.unauthenticated",
  FORBIDDEN: "platform.errors.forbidden",
  CONFLICT: "platform.errors.conflict",
  RATE_LIMITED: "platform.errors.rateLimited",
  TENANT_SUSPENDED: "platform.errors.tenantSuspended",
  MODULE_DISABLED: "platform.errors.moduleDisabled",
  LIMIT_EXCEEDED: "platform.errors.limitExceeded",
  PAYMENT_ERROR: "platform.errors.payment",
};

/** "academic.errors.nameRequired" -> "Name Required" — a readable fallback for the many backend keys with no real translation, not a substitute for one. */
function humanizeKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface DisplayError {
  title: string;
  description?: string;
}

export function getErrorMessage(error: unknown): DisplayError {
  const t = i18next.t.bind(i18next);

  if (error instanceof AdminApiError) {
    const messageKey = ERROR_CODE_MESSAGE_KEY[error.code];
    const title = messageKey ? (t(messageKey) as string) : (t("platform.errors.unknown") as string);

    if (error.fields && Object.keys(error.fields).length > 0) {
      const description = Object.entries(error.fields)
        .map(([field, msg]) => `${field}: ${humanizeKey(msg)}`)
        .join(" · ");
      return { title, description };
    }
    // No field-level detail (e.g. NOT_FOUND/FORBIDDEN) — the raw message is
    // still a real i18n key, not sentence-shaped, so it's shown humanized
    // rather than verbatim only when there's no cleaner translated title.
    return { title, description: messageKey ? undefined : humanizeKey(error.message) };
  }

  if (error instanceof Error) {
    return { title: t("platform.errors.unknown") as string, description: error.message };
  }

  return { title: t("platform.errors.unknown") as string };
}
