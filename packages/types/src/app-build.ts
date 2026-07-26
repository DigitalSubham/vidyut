/** context/data-model.md §13, context/architecture-context.md Part 2 §5.3. */
export const APP_BUILD_STORE_STATUSES = [
  "PENDING",
  "BUILDING",
  "SUBMITTED",
  "LIVE",
  "FAILED",
] as const;
export type AppBuildStoreStatus = (typeof APP_BUILD_STORE_STATUSES)[number];

export const APP_BUILD_PLATFORMS = ["ANDROID", "IOS"] as const;
export type AppBuildPlatform = (typeof APP_BUILD_PLATFORMS)[number];
