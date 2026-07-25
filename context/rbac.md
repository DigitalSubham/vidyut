# RBAC — Roles & Permissions (Vidyut)

Roles bundle **permission strings**; permissions are checked at every mutation boundary (after auth + tenant context). Role assignments can be **branch-scoped** (`UserRole.branchId`) for multi-branch. Data model: `data-model.md` §3.

## Roles

| Key | Who | Branch scope |
|---|---|---|
| `SUPERADMIN` | Us (ERP owner) — platform console | All tenants (separate guard, not `withTenant`) |
| `OWNER` | School owner/director | **All branches** of the tenant |
| `PRINCIPAL` | Principal / academic head | One or more branches |
| `ADMIN` | Office/admin staff | Usually one branch |
| `ACCOUNTANT` | Fees/accounts | Usually one branch |
| `TEACHER` | Teacher | One branch (their sections) |
| `PARENT` | Guardian | Self — only their linked children |
| `STUDENT` | Student | Self — only their own records |

Parents/students are **self-scoped**: they read only their own (children's) data; no permission grid needed beyond `self.view` + `fees.pay(self)`.

## Permission matrix (staff/admin roles)

✓ = allowed. Permissions are strings (e.g. `fees.collect`). Roles are seeded defaults per tenant and editable.

| Permission | OWNER | PRINCIPAL | ADMIN | ACCOUNTANT | TEACHER |
|---|:--:|:--:|:--:|:--:|:--:|
| `branch.manage` | ✓ | | | | |
| `session.manage` | ✓ | ✓ | ✓ | | |
| `settings.manage` | ✓ | ✓ | | | |
| `user.manage` / `role.manage` | ✓ | | | | |
| `student.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `student.edit` | ✓ | ✓ | ✓ | | |
| `student.import` | ✓ | ✓ | ✓ | | |
| `student.delete` | ✓ | | | | |
| `guardian.manage` | ✓ | ✓ | ✓ | | |
| `admission.manage` | ✓ | ✓ | ✓ | | |
| `staff.manage` | ✓ | ✓ | | | |
| `leave.apply` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `leave.approve` | ✓ | ✓ | | | |
| `class.manage` / `subject.manage` | ✓ | ✓ | ✓ | | |
| `timetable.manage` | ✓ | ✓ | ✓ | | |
| `attendance.mark` | | ✓ | ✓ | | ✓ |
| `attendance.view` | ✓ | ✓ | ✓ | | ✓ |
| `attendance.regularize` | ✓ | ✓ | ✓ | | |
| `exam.manage` | ✓ | ✓ | ✓ | | |
| `marks.enter` | | ✓ | | | ✓ |
| `marks.moderate` | ✓ | ✓ | | | |
| `reportcard.generate` | ✓ | ✓ | ✓ | | |
| `reportcard.publish` | ✓ | ✓ | | | |
| `fee.setup` | ✓ | | | ✓ | |
| `fees.collect` | ✓ | | ✓ | ✓ | |
| `fee.view` | ✓ | ✓ | ✓ | ✓ | |
| `fee.concession.approve` | ✓ | | | ✓ | |
| `fee.refund` | ✓ | | | ✓ | |
| `fee.reports` | ✓ | ✓ | | ✓ | |
| `certificate.issue` | ✓ | ✓ | ✓ | | |
| `homework.manage` | | ✓ | | | ✓ |
| `announcement.send` | ✓ | ✓ | ✓ | | |
| `notification.send` | ✓ | ✓ | ✓ | ✓ | |
| `dashboard.owner` | ✓ | | | | |
| `dashboard.principal` | ✓ | ✓ | | | |
| `subscription.view` | ✓ | | | | |

## Platform permissions (SUPERADMIN only)
`tenant.manage` · `plan.manage` · `module.toggle` · `billing.manage` · `wallet.manage` · `appbuild.manage` · `impersonate` (time-boxed, audited) · `support.view` · `monitoring.view`.

## Rules
1. Check permission **after** auth + tenant context + branch scope.
2. Permission strings live in a static catalog (`packages/types`); `RolePermission` maps role→permissions per tenant.
3. Branch-scoped roles: a `PRINCIPAL` assigned to Branch A can't act on Branch B unless also assigned there. `OWNER` spans all branches of the tenant.
4. `OWNER` can edit roles/permissions for their tenant (except platform perms). System roles (`isSystem`) can be extended but not deleted.
5. Parents/students bypass the grid — enforce **self-ownership** checks instead (their `userId` ↔ student links).
6. Every permission-gated mutation is covered by a test (allowed role passes, others 403; cross-branch denied).
