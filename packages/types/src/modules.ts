import type { PlanKey } from "./plans";

/** context/plans-entitlements.md module entitlement matrix. */
export const MODULE_KEYS = [
  "students",
  "attendance",
  "fees",
  "communication",
  "parent_app",
  "teacher_app",
  "exams_reportcards",
  "admissions",
  "certificates",
  "timetable",
  "homework",
  "online_payment",
  "owner_dashboard",
  "staff_leave",
  "multi_branch",
  "payroll",
  "transport",
  "analytics_advanced",
  "dedicated_app",
  "library",
  "hostel",
  "inventory",
  "accounting",
  "ai_features",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * Modules enabled by default per plan (✓ and "basic" rows in
 * plans-entitlements.md). Add-ons default off — a super-admin can grant them
 * per tenant by overriding the ModuleToggle row. Seeded onto every new
 * tenant at creation; re-seeded (not merged) on a plan change.
 */
export const DEFAULT_PLAN_MODULES: Record<PlanKey, ModuleKey[]> = {
  STARTER: ["students", "attendance", "fees", "communication", "parent_app", "teacher_app", "owner_dashboard"],
  STANDARD: [
    "students",
    "attendance",
    "fees",
    "communication",
    "parent_app",
    "teacher_app",
    "exams_reportcards",
    "admissions",
    "certificates",
    "timetable",
    "homework",
    "online_payment",
    "owner_dashboard",
    "staff_leave",
  ],
  PRO: [
    "students",
    "attendance",
    "fees",
    "communication",
    "parent_app",
    "teacher_app",
    "exams_reportcards",
    "admissions",
    "certificates",
    "timetable",
    "homework",
    "online_payment",
    "owner_dashboard",
    "staff_leave",
    "multi_branch",
    "analytics_advanced",
  ],
  ENTERPRISE: [
    "students",
    "attendance",
    "fees",
    "communication",
    "parent_app",
    "teacher_app",
    "exams_reportcards",
    "admissions",
    "certificates",
    "timetable",
    "homework",
    "online_payment",
    "owner_dashboard",
    "staff_leave",
    "multi_branch",
    "payroll",
    "analytics_advanced",
    "dedicated_app",
  ],
};
