import { randomUUID } from "node:crypto";
import { prisma, withTenant } from "@vidyut/db";
import type { Permission, RoleKey } from "@vidyut/types";
import * as argon2 from "argon2";

export async function createTenant(namePrefix: string) {
  return prisma.tenant.create({
    data: { name: namePrefix, slug: `${namePrefix.toLowerCase()}-${randomUUID()}` },
  });
}

export async function createBranch(tenantId: string, code: string) {
  return withTenant(tenantId, (tx) =>
    tx.branch.create({
      data: { tenantId, name: `Branch ${code}`, code },
    })
  );
}

export async function createRoleWithPermissions(
  tenantId: string,
  key: RoleKey,
  permissions: Permission[] = []
) {
  return withTenant(tenantId, async (tx) => {
    const role = await tx.role.create({
      data: { tenantId, key, name: key, isSystem: true },
    });
    for (const permissionKey of permissions) {
      await tx.rolePermission.create({
        data: { tenantId, roleId: role.id, permissionKey },
      });
    }
    return role;
  });
}

export async function createStaffUser(
  tenantId: string,
  opts: { email: string; password: string; roleId: string; branchId?: string; twoFactorEnabled?: boolean }
) {
  const passwordHash = await argon2.hash(opts.password, { type: argon2.argon2id });
  return withTenant(tenantId, async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        name: opts.email,
        email: opts.email,
        passwordHash,
        status: "ACTIVE",
        twoFactorEnabled: opts.twoFactorEnabled ?? false,
      },
    });
    await tx.userRole.create({
      data: { tenantId, userId: user.id, roleId: opts.roleId, branchId: opts.branchId ?? null },
    });
    if (opts.branchId) {
      await tx.branchMembership.create({
        data: { tenantId, userId: user.id, branchId: opts.branchId },
      });
    }
    return user;
  });
}

export async function createParentUser(
  tenantId: string,
  opts: { phone: string; roleId: string; branchId?: string }
) {
  return withTenant(tenantId, async (tx) => {
    const user = await tx.user.create({
      data: { tenantId, name: opts.phone, phone: opts.phone, status: "ACTIVE" },
    });
    await tx.userRole.create({
      data: { tenantId, userId: user.id, roleId: opts.roleId, branchId: opts.branchId ?? null },
    });
    if (opts.branchId) {
      await tx.branchMembership.create({
        data: { tenantId, userId: user.id, branchId: opts.branchId },
      });
    }
    return user;
  });
}

export async function cleanupTenant(tenantId: string) {
  // Platform tables carry no RLS (context/data-model.md §13) — plain prisma calls.
  await prisma.appBuild.deleteMany({ where: { tenantId } });
  await prisma.smsWallet.deleteMany({ where: { tenantId } });
  await prisma.walletTxn.deleteMany({ where: { tenantId } });
  await prisma.moduleToggle.deleteMany({ where: { tenantId } });
  await prisma.platformInvoice.deleteMany({ where: { tenantId } });
  await prisma.subscription.deleteMany({ where: { tenantId } });

  await withTenant(tenantId, async (tx) => {
    // AuditLog IS RLS-scoped (unlike the platform tables above) — must be
    // deleted inside withTenant, or the delete silently matches zero rows.
    await tx.auditLog.deleteMany({ where: { tenantId } });
    await tx.refreshToken.deleteMany({ where: { tenantId } });
    await tx.userRole.deleteMany({ where: { tenantId } });
    await tx.branchMembership.deleteMany({ where: { tenantId } });
    await tx.rolePermission.deleteMany({ where: { tenantId } });
    await tx.role.deleteMany({ where: { tenantId } });
    await tx.attendanceRecord.deleteMany({ where: { tenantId } });
    await tx.marksEntry.deleteMany({ where: { tenantId } });
    await tx.reportCard.deleteMany({ where: { tenantId } });
    await tx.reportCardTemplate.deleteMany({ where: { tenantId } });
    await tx.examSubject.deleteMany({ where: { tenantId } });
    await tx.exam.deleteMany({ where: { tenantId } });
    await tx.notificationLog.deleteMany({ where: { tenantId } });
    await tx.announcement.deleteMany({ where: { tenantId } });
    await tx.certificate.deleteMany({ where: { tenantId } });
    await tx.timetablePeriod.deleteMany({ where: { tenantId } });
    await tx.homework.deleteMany({ where: { tenantId } });
    await tx.refundRequest.deleteMany({ where: { tenantId } });
    await tx.receipt.deleteMany({ where: { tenantId } });
    await tx.payment.deleteMany({ where: { tenantId } });
    await tx.invoiceItem.deleteMany({ where: { tenantId } });
    await tx.invoice.deleteMany({ where: { tenantId } });
    await tx.concession.deleteMany({ where: { tenantId } });
    await tx.feeAssignment.deleteMany({ where: { tenantId } });
    await tx.fineRule.deleteMany({ where: { tenantId } });
    await tx.feeStructureItem.deleteMany({ where: { tenantId } });
    await tx.feeStructure.deleteMany({ where: { tenantId } });
    await tx.feeHead.deleteMany({ where: { tenantId } });
    await tx.application.deleteMany({ where: { tenantId } });
    await tx.enquiry.deleteMany({ where: { tenantId } });
    await tx.leaveRequest.deleteMany({ where: { tenantId } });
    await tx.teacherAssignment.deleteMany({ where: { tenantId } });
    await tx.staff.deleteMany({ where: { tenantId } });
    await tx.user.deleteMany({ where: { tenantId } });
    await tx.classSubject.deleteMany({ where: { tenantId } });
    await tx.studentGuardian.deleteMany({ where: { tenantId } });
    await tx.guardian.deleteMany({ where: { tenantId } });
    await tx.enrollment.deleteMany({ where: { tenantId } });
    await tx.student.deleteMany({ where: { tenantId } });
    await tx.section.deleteMany({ where: { tenantId } });
    await tx.class.deleteMany({ where: { tenantId } });
    await tx.subject.deleteMany({ where: { tenantId } });
    await tx.academicSession.deleteMany({ where: { tenantId } });
    await tx.branch.deleteMany({ where: { tenantId } });
  });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}

export async function createPlatformUser(opts: { email: string; password: string }) {
  const passwordHash = await argon2.hash(opts.password, { type: argon2.argon2id });
  return prisma.platformUser.create({
    data: { name: opts.email, email: opts.email, passwordHash, status: "ACTIVE" },
  });
}

export async function cleanupPlatformUser(id: string) {
  await prisma.platformUser.deleteMany({ where: { id } });
}
