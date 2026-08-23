/**
 * Static permission catalog — context/rbac.md. Roles are bundles of these
 * strings; RolePermission maps role -> permissions per tenant.
 */
export const PERMISSIONS = [
  "branch.manage",
  "session.manage",
  "settings.manage",
  "user.manage",
  "role.manage",
  "student.view",
  "student.edit",
  "student.import",
  "student.delete",
  "guardian.manage",
  "admission.manage",
  "staff.manage",
  "leave.apply",
  "leave.approve",
  "class.manage",
  "subject.manage",
  "timetable.manage",
  "attendance.mark",
  "attendance.view",
  "attendance.regularize",
  "exam.manage",
  "marks.enter",
  "marks.moderate",
  "reportcard.generate",
  "reportcard.publish",
  "fee.setup",
  "fees.collect",
  "fee.view",
  "fee.concession.approve",
  "fee.refund",
  "fee.reports",
  "certificate.issue",
  "homework.manage",
  "announcement.send",
  "notification.send",
  "engagement.manage",
  "dashboard.owner",
  "dashboard.principal",
  "subscription.view",
  "transport.manage",
  "library.manage",
  "hostel.manage",
  "frontoffice.manage",
  "wellbeing.manage",
  "accounting.manage",
  "payroll.manage",
  "inventory.manage",
  "task.manage",
  "lms.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** SUPERADMIN-only, platform-level — never checked via withTenant(). */
export const PLATFORM_PERMISSIONS = [
  "tenant.manage",
  "plan.manage",
  "module.toggle",
  "billing.manage",
  "wallet.manage",
  "appbuild.manage",
  "impersonate",
  "support.view",
  "monitoring.view",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

/**
 * PARENT/STUDENT bypass the permission grid — self-scope checks apply
 * instead (context/rbac.md rule 5). Kept here only so guard code has a
 * single, typed reference for these two special cases.
 */
export const SELF_PERMISSIONS = ["self.view", "fees.pay"] as const;

export type SelfPermission = (typeof SELF_PERMISSIONS)[number];
