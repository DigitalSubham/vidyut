"use client";

import { useEffect } from "react";

/** Unit 29's branded-PWA fallback (context/architecture-context.md's white-label doc §6) — a plain installable PWA, no build-time SW generator library. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability degrades gracefully — the site still works without an SW.
      });
    }
  }, []);
  return null;
}
