import type { ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;

/**
 * OTA channel strategy (context/feature-specs/31's Open Question 3): one
 * shared channel for every SHARED-mode tenant (a JS-only fix reaches them
 * all at once, matching how the shared app already behaves), a per-tenant
 * channel for DEDICATED-mode tenants (so one school's own native additions,
 * if any, never leak into another school's update). VIDYUT_APP_MODE/
 * VIDYUT_TENANT_ID are set per EAS build profile (see eas.json) — both
 * fall back to shared-mode defaults for local dev.
 */
const appMode = process.env.VIDYUT_APP_MODE ?? "SHARED";
const otaChannel = appMode === "DEDICATED" ? `dedicated-${process.env.VIDYUT_TENANT_ID ?? "unknown"}` : "shared";

// Real bug fixed here (Unit 31): applicationId/bundleIdentifier/name were
// hardcoded to "com.vidyut.app" / "Vidyut" for every build, which directly
// violates architecture-context.md §4/§5.1's non-negotiable Google Play
// requirement that every white-label build have a UNIQUE applicationId and
// app name per school (a shared id across dedicated apps is a Repetitive
// Content policy violation, not a cosmetic detail). Now tenant-parameterized
// via env vars EAS build profiles set per dedicated build; shared-mode
// builds (the default) are unaffected since these all fall back to the
// original shared identity.
const tenantSlug = process.env.VIDYUT_TENANT_SLUG;
const appName = process.env.VIDYUT_APP_NAME ?? "Vidyut";
const applicationId = tenantSlug ? `com.vidyut.school.${tenantSlug}` : "com.vidyut.app";

/**
 * Base config, still shared-mode by default (context/feature-specs/15b's
 * scope). Dedicated/white-label per-tenant variants (own app icon, package
 * name) are set via EAS build profile overrides at build time (Unit 31),
 * not by branching this file per tenant — one config, env-driven.
 */
const config: ExpoConfig = {
  name: appName,
  slug: "vidyut",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: EAS_PROJECT_ID ? `https://u.expo.dev/${EAS_PROJECT_ID}` : undefined,
    requestHeaders: { "expo-channel-name": otaChannel },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: applicationId,
  },
  android: {
    package: applicationId,
  },
  extra: {
    // Points at the local apps/api dev server by default; overridden per
    // environment via EAS build profiles / app.config env vars later.
    apiBaseUrl: process.env.VIDYUT_API_BASE_URL ?? "http://localhost:4000/api/v1",
    eas: EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
  },
};

export default config;
