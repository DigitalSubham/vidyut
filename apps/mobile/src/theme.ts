/**
 * Vidyut brand tokens (context/ui-context.md / brand.md), kept in sync by
 * hand: mobile has no shared cross-platform token package yet — web-app's
 * tokens live in Tailwind CSS (globals.css), which React Native can't
 * consume directly. If a `packages/ui` token export is ever added for
 * both platforms, this file should be replaced by it, not duplicated
 * further.
 */
export const colors = {
  bgBase: "#F8FAFC",
  bgSurface: "#FFFFFF",
  bgSubtle: "#EEF1F6",
  bgElevated: "#F1F4F9",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  brand: "#4F46E5",
  brandHover: "#4338CA",
  brandTint: "#EEF0FF",
  accent: "#06B6D4",
  success: "#16A34A",
  successTint: "#DCFCE7",
  warning: "#D97706",
  warningTint: "#FEF3C7",
  danger: "#DC2626",
  dangerTint: "#FEE2E2",
  muted: "#64748B",
  mutedTint: "#F1F5F9",
} as const;
