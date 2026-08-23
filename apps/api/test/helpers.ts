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
    await tx.supportTicket.deleteMany({ where: { tenantId } });
    await tx.dataDeletionRequest.deleteMany({ where: { tenantId } });
    await tx.notificationTemplate.deleteMany({ where: { tenantId } });
    // Unit 68 — deleted before User/Branch.
    await tx.communicationPreference.deleteMany({ where: { tenantId } });
    await tx.newsletter.deleteMany({ where: { tenantId } });
    await tx.refreshToken.deleteMany({ where: { tenantId } });
    await tx.userRole.deleteMany({ where: { tenantId } });
    await tx.branchMembership.deleteMany({ where: { tenantId } });
    await tx.rolePermission.deleteMany({ where: { tenantId } });
    await tx.role.deleteMany({ where: { tenantId } });
    await tx.attendanceRecord.deleteMany({ where: { tenantId } });
    await tx.marksEntry.deleteMany({ where: { tenantId } });
    await tx.reportCard.deleteMany({ where: { tenantId } });
    await tx.reportCardTemplate.deleteMany({ where: { tenantId } });
    await tx.onlineExamSubmission.deleteMany({ where: { tenantId } });
    await tx.onlineExamQuestion.deleteMany({ where: { tenantId } });
    await tx.onlineExam.deleteMany({ where: { tenantId } });
    await tx.questionBankItem.deleteMany({ where: { tenantId } });
    await tx.coScholasticGrade.deleteMany({ where: { tenantId } });
    await tx.examTimetable.deleteMany({ where: { tenantId } });
    await tx.examSubject.deleteMany({ where: { tenantId } });
    await tx.exam.deleteMany({ where: { tenantId } });
    await tx.notificationLog.deleteMany({ where: { tenantId } });
    await tx.announcement.deleteMany({ where: { tenantId } });
    await tx.publicNotice.deleteMany({ where: { tenantId } });
    await tx.certificate.deleteMany({ where: { tenantId } });
    await tx.certificateTemplate.deleteMany({ where: { tenantId } });
    await tx.document.deleteMany({ where: { tenantId } });
    await tx.substitution.deleteMany({ where: { tenantId } });
    await tx.timetablePeriod.deleteMany({ where: { tenantId } });
    await tx.homeworkSubmission.deleteMany({ where: { tenantId } });
    await tx.homework.deleteMany({ where: { tenantId } });
    await tx.refundRequest.deleteMany({ where: { tenantId } });
    await tx.receipt.deleteMany({ where: { tenantId } });
    await tx.chequePayment.deleteMany({ where: { tenantId } });
    await tx.payment.deleteMany({ where: { tenantId } });
    await tx.invoiceItem.deleteMany({ where: { tenantId } });
    await tx.invoice.deleteMany({ where: { tenantId } });
    await tx.concession.deleteMany({ where: { tenantId } });
    // Unit 65 — deleted before Staff.
    await tx.staffTask.deleteMany({ where: { tenantId } });
    // Unit 64 — deleted before Student/Branch/FeeAssignment references.
    await tx.storeOrder.deleteMany({ where: { tenantId } });
    await tx.storeItem.deleteMany({ where: { tenantId } });
    await tx.grnLine.deleteMany({ where: { tenantId } });
    await tx.grn.deleteMany({ where: { tenantId } });
    await tx.purchaseOrder.deleteMany({ where: { tenantId } });
    await tx.stockMovement.deleteMany({ where: { tenantId } });
    await tx.inventoryItem.deleteMany({ where: { tenantId } });
    await tx.store.deleteMany({ where: { tenantId } });
    await tx.asset.deleteMany({ where: { tenantId } });
    // Unit 63 — deleted before Staff.
    await tx.salaryStructure.deleteMany({ where: { tenantId } });
    // Unit 62 — deleted before Branch.
    await tx.expense.deleteMany({ where: { tenantId } });
    await tx.expenseHead.deleteMany({ where: { tenantId } });
    // Unit 61 — deleted before Student.
    await tx.canteenTxn.deleteMany({ where: { tenantId } });
    await tx.canteenWallet.deleteMany({ where: { tenantId } });
    await tx.award.deleteMany({ where: { tenantId } });
    await tx.disciplineIncident.deleteMany({ where: { tenantId } });
    await tx.healthRecord.deleteMany({ where: { tenantId } });
    await tx.lostFoundEntry.deleteMany({ where: { tenantId } });
    // Unit 60 — deleted before Student/Staff.
    await tx.gatePass.deleteMany({ where: { tenantId } });
    await tx.visitor.deleteMany({ where: { tenantId } });
    await tx.complaintDeskEntry.deleteMany({ where: { tenantId } });
    await tx.callLogEntry.deleteMany({ where: { tenantId } });
    await tx.postalLogEntry.deleteMany({ where: { tenantId } });
    // Unit 59 — deleted before FeeAssignment/Room/HostelBlock/Student, which they reference.
    await tx.hostelAttendanceRecord.deleteMany({ where: { tenantId } });
    await tx.roomAllocation.deleteMany({ where: { tenantId } });
    await tx.room.deleteMany({ where: { tenantId } });
    await tx.hostelBlock.deleteMany({ where: { tenantId } });
    // Unit 58 — deleted before Invoice/LibraryMember/BookCopy, which they reference.
    await tx.bookIssue.deleteMany({ where: { tenantId } });
    await tx.libraryMember.deleteMany({ where: { tenantId } });
    await tx.bookCopy.deleteMany({ where: { tenantId } });
    await tx.book.deleteMany({ where: { tenantId } });
    // Unit 57 — deleted before FeeAssignment/Vehicle/Route, which they reference.
    await tx.locationPing.deleteMany({ where: { tenantId } });
    await tx.studentRouteAllocation.deleteMany({ where: { tenantId } });
    await tx.driver.deleteMany({ where: { tenantId } });
    await tx.vehicle.deleteMany({ where: { tenantId } });
    await tx.routeStop.deleteMany({ where: { tenantId } });
    await tx.route.deleteMany({ where: { tenantId } });
    await tx.feeAssignment.deleteMany({ where: { tenantId } });
    await tx.fineRule.deleteMany({ where: { tenantId } });
    await tx.feeStructureItem.deleteMany({ where: { tenantId } });
    await tx.feeStructure.deleteMany({ where: { tenantId } });
    await tx.feeHead.deleteMany({ where: { tenantId } });
    await tx.application.deleteMany({ where: { tenantId } });
    await tx.enquiry.deleteMany({ where: { tenantId } });
    await tx.leaveRequest.deleteMany({ where: { tenantId } });
    // Unit 49 — deleted before Staff/Guardian/Circular/Survey/GalleryAlbum,
    // which they reference.
    await tx.circularAck.deleteMany({ where: { tenantId } });
    await tx.circular.deleteMany({ where: { tenantId } });
    await tx.pTMSlot.deleteMany({ where: { tenantId } });
    await tx.calendarEvent.deleteMany({ where: { tenantId } });
    await tx.complaint.deleteMany({ where: { tenantId } });
    await tx.surveyResponse.deleteMany({ where: { tenantId } });
    await tx.surveyQuestion.deleteMany({ where: { tenantId } });
    await tx.survey.deleteMany({ where: { tenantId } });
    await tx.galleryPhoto.deleteMany({ where: { tenantId } });
    await tx.galleryAlbum.deleteMany({ where: { tenantId } });
    await tx.message.deleteMany({ where: { tenantId } });
    await tx.teacherAssignment.deleteMany({ where: { tenantId } });
    await tx.staffAttendanceRecord.deleteMany({ where: { tenantId } });
    // Unit 67 — deleted before Staff/Section/Class/Subject.
    await tx.syllabusChapter.deleteMany({ where: { tenantId } });
    await tx.lessonPlan.deleteMany({ where: { tenantId } });
    await tx.contentItem.deleteMany({ where: { tenantId } });
    await tx.liveClassLink.deleteMany({ where: { tenantId } });
    await tx.staff.deleteMany({ where: { tenantId } });
    await tx.user.deleteMany({ where: { tenantId } });
    await tx.studentElectiveChoice.deleteMany({ where: { tenantId } });
    await tx.classSubject.deleteMany({ where: { tenantId } });
    await tx.electiveGroup.deleteMany({ where: { tenantId } });
    await tx.studentGuardian.deleteMany({ where: { tenantId } });
    await tx.guardian.deleteMany({ where: { tenantId } });
    await tx.enrollment.deleteMany({ where: { tenantId } });
    // Unit 66 — deleted before Student (its FK is ON DELETE SET NULL, but
    // deleted explicitly for clarity); the timeline entries reference Student directly.
    await tx.studentTimelineEntry.deleteMany({ where: { tenantId } });
    await tx.student.deleteMany({ where: { tenantId } });
    await tx.siblingGroup.deleteMany({ where: { tenantId } });
    await tx.house.deleteMany({ where: { tenantId } });
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
