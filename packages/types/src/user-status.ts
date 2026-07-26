/** context/data-model.md §3 */
export const USER_STATUSES = ["ACTIVE", "INACTIVE", "INVITED"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
