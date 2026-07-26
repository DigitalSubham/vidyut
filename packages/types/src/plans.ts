/** context/plans-entitlements.md */
export const PLAN_KEYS = ["STARTER", "STANDARD", "PRO", "ENTERPRISE"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface PlanLimits {
  /** null = unlimited (Enterprise). */
  studentLimit: number | null;
  userLimit: number | null;
  branchLimit: number | null;
  storageGb: number | null;
}

/** context/plans-entitlements.md plan matrix — upper bound of each band. */
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  STARTER: { studentLimit: 150, userLimit: 15, branchLimit: 1, storageGb: 5 },
  STANDARD: { studentLimit: 500, userLimit: 40, branchLimit: 1, storageGb: 20 },
  PRO: { studentLimit: 1000, userLimit: 100, branchLimit: 3, storageGb: 50 },
  ENTERPRISE: { studentLimit: null, userLimit: null, branchLimit: null, storageGb: null },
};
