import type { MetadataRoute } from "next";

/**
 * A standard installable PWA manifest (Next.js's built-in metadata route —
 * no next-pwa dependency needed). Per-tenant branding (name/logo/colors)
 * happens on the actual page content the manifest points at; the manifest
 * itself stays generic since it's served at a fixed URL shared by every
 * tenant visiting this app (context/feature-specs/29's Open Question 2).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidyut",
    short_name: "Vidyut",
    description: "Your school's public page and online admission form.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#4F46E5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
