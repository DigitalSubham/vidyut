import * as argon2 from "argon2";
import { DEFAULT_PLAN_MODULES, PLAN_LIMITS, type PlanKey } from "@vidyut/types";
import { prisma } from "../src/client";
import { withTenant } from "../src/with-tenant";
import { seedDefaultRoles } from "../src/seed-roles";
import { seedModuleToggles } from "../src/seed-modules";
import { generateSchoolCode } from "../src/generate-school-code";
import { nextInvoiceNumber, nextReceiptNumber } from "../src/generate-invoice-number";
import { nextCertificateNumber } from "../src/generate-certificate-number";

/**
 * Canonical launch prices (context/plans-entitlements.md — bands, one
 * concrete figure picked per plan as the doc instructs). Enterprise is
 * explicitly "custom" in the market research; ₹1,00,000/₹20,000 here are a
 * clearly-placeholder seed value, never charged as-is — real Enterprise
 * deals are quoted manually. Confirm all four again before Unit 30 (billing).
 */
const PLAN_PRICING: Record<PlanKey, { priceYear: number; setupFee: number }> = {
  STARTER: { priceYear: 7_999_00, setupFee: 2_000_00 },
  STANDARD: { priceYear: 18_000_00, setupFee: 5_000_00 },
  PRO: { priceYear: 36_000_00, setupFee: 8_000_00 },
  ENTERPRISE: { priceYear: 1_00_000_00, setupFee: 20_000_00 },
};

async function seedPlans() {
  for (const key of Object.keys(PLAN_PRICING) as PlanKey[]) {
    const pricing = PLAN_PRICING[key];
    const limits = PLAN_LIMITS[key];
    await prisma.plan.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: key.charAt(0) + key.slice(1).toLowerCase(),
        priceYear: pricing.priceYear,
        setupFee: pricing.setupFee,
        studentLimit: limits.studentLimit,
        userLimit: limits.userLimit,
        branchLimit: limits.branchLimit,
        storageGb: limits.storageGb,
        appType: key === "ENTERPRISE" ? "DEDICATED" : "SHARED",
        modules: DEFAULT_PLAN_MODULES[key],
      },
    });
  }
}

async function main() {
  await seedPlans();
  const standardPlan = await prisma.plan.findUniqueOrThrow({ where: { key: "STANDARD" } });

  // Tenant is platform-level (no RLS) — direct access is fine.
  const existingDemo = await prisma.tenant.findUnique({ where: { slug: "demo-school" } });
  // Backfill via `update` too — a tenant created before Unit 15b added
  // schoolCode (or any tenant whose value is still null for some other
  // reason) would otherwise never get one, since `upsert`'s `create` branch
  // only runs once and re-running this script afterward only ever hits `update`.
  const schoolCode = existingDemo?.schoolCode ?? (await generateSchoolCode());
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-school" },
    update: { schoolCode },
    create: {
      name: "Demo School",
      slug: "demo-school",
      schoolCode,
      status: "TRIAL",
      planId: standardPlan.id,
      appType: "SHARED",
      locale: "en",
    },
  });

  await seedModuleToggles(tenant.id, "STANDARD");

  // Branch and AcademicSession are tenant-owned and RLS-scoped — every access
  // goes through withTenant(), including seeding.
  const branch = await withTenant(tenant.id, (tx) =>
    tx.branch.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "MAIN" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo School — Main Branch",
        code: "MAIN",
        board: "CBSE",
        isActive: true,
      },
    })
  );

  await withTenant(tenant.id, (tx) =>
    tx.academicSession.upsert({
      where: { branchId_name: { branchId: branch.id, name: "2026-27" } },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        name: "2026-27",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    })
  );

  // Default system roles + their permission grid (context/rbac.md), owner-editable afterwards.
  const roleByKey = await seedDefaultRoles(tenant.id);

  // Demo OWNER login (dev credentials — never used outside local/demo seeding).
  const ownerPasswordHash = await argon2.hash("Owner@12345", { type: argon2.argon2id });
  const owner = await withTenant(tenant.id, (tx) =>
    tx.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "owner@demo-school.test" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo Owner",
        email: "owner@demo-school.test",
        passwordHash: ownerPasswordHash,
        status: "ACTIVE",
      },
    })
  );
  const ownerRoleId = roleByKey.OWNER;
  // Prisma's compound-unique upsert filter can't take a literal null for
  // branchId, so OWNER (tenant-wide, branchId: null) is upserted manually.
  await withTenant(tenant.id, async (tx) => {
    const existing = await tx.userRole.findFirst({
      where: { userId: owner.id, roleId: ownerRoleId, branchId: null },
    });
    if (!existing) {
      await tx.userRole.create({
        data: { tenantId: tenant.id, userId: owner.id, roleId: ownerRoleId, branchId: null },
      });
    }
  });
  await withTenant(tenant.id, (tx) =>
    tx.branchMembership.upsert({
      where: { userId_branchId: { userId: owner.id, branchId: branch.id } },
      update: {},
      create: { tenantId: tenant.id, userId: owner.id, branchId: branch.id },
    })
  );

  // Demo PARENT login (OTP-based — no password), for manual/dev OTP testing.
  const parent = await withTenant(tenant.id, (tx) =>
    tx.user.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: "+919999999999" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Demo Parent",
        phone: "+919999999999",
        status: "ACTIVE",
      },
    })
  );
  const parentRoleId = roleByKey.PARENT;
  await withTenant(tenant.id, (tx) =>
    tx.userRole.upsert({
      where: {
        userId_roleId_branchId: { userId: parent.id, roleId: parentRoleId, branchId: branch.id },
      },
      update: {},
      create: { tenantId: tenant.id, userId: parent.id, roleId: parentRoleId, branchId: branch.id },
    })
  );
  await withTenant(tenant.id, (tx) =>
    tx.branchMembership.upsert({
      where: { userId_branchId: { userId: parent.id, branchId: branch.id } },
      update: {},
      create: { tenantId: tenant.id, userId: parent.id, branchId: branch.id },
    })
  );

  // Demo super-admin login — platform-level, no tenantId (dev credentials only).
  const platformPasswordHash = await argon2.hash("SuperAdmin@12345", { type: argon2.argon2id });
  await prisma.platformUser.upsert({
    where: { email: "superadmin@vidyut.test" },
    update: {},
    create: {
      name: "Demo Super Admin",
      email: "superadmin@vidyut.test",
      passwordHash: platformPasswordHash,
      status: "ACTIVE",
    },
  });

  await seedDemoAcademicData(tenant.id, branch.id, owner.id, parent.id);

  console.log(`Seeded demo tenant "${tenant.slug}" with branch "${branch.code}", roles, and demo users.`);
}

/**
 * Unit 35's Open Question 2: a bare tenant/branch/session isn't enough for a
 * live sales demo or manual QA by Unit 35 — this populates one realistic,
 * lived-in demo tenant across every module built in v1 (classes/sections/
 * subjects/staff/students, a term of attendance/marks/report cards, fee
 * structures/invoices/payments, an announcement, a certificate, a
 * timetable, an admission enquiry). Every write is upsert-or-find-then-
 * create so re-running `pnpm run db:seed` never duplicates rows.
 */
async function seedDemoAcademicData(
  tenantId: string,
  branchId: string,
  ownerUserId: string,
  demoParentUserId: string
) {
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.findFirstOrThrow({ where: { branchId, isCurrent: true } })
  );

  const classes = await withTenant(tenantId, async (tx) => {
    const class9 = await tx.class.upsert({
      where: { branchId_name: { branchId, name: "Class 9" } },
      update: {},
      create: { tenantId, branchId, name: "Class 9", order: 9 },
    });
    const class10 = await tx.class.upsert({
      where: { branchId_name: { branchId, name: "Class 10" } },
      update: {},
      create: { tenantId, branchId, name: "Class 10", order: 10 },
    });
    return { class9, class10 };
  });

  const section9A = await withTenant(tenantId, (tx) =>
    tx.section.upsert({
      where: { classId_name: { classId: classes.class9.id, name: "9-A" } },
      update: {},
      create: { tenantId, branchId, classId: classes.class9.id, name: "9-A", capacity: 40 },
    })
  );

  const subjectCodes = ["MATH", "SCI", "ENG", "HIN"] as const;
  type SubjectCode = (typeof subjectCodes)[number];
  const subjects = await withTenant(tenantId, async (tx) => {
    const bySubjectCode = {} as Record<SubjectCode, Awaited<ReturnType<typeof tx.subject.create>>>;
    for (const [name, code] of [
      ["Mathematics", "MATH"],
      ["Science", "SCI"],
      ["English", "ENG"],
      ["Hindi", "HIN"],
    ] as const) {
      bySubjectCode[code] =
        (await tx.subject.findFirst({ where: { branchId, code } })) ??
        (await tx.subject.create({ data: { tenantId, branchId, name, code, type: "CORE" } }));
    }
    return bySubjectCode;
  });

  await withTenant(tenantId, async (tx) => {
    for (const subject of Object.values(subjects)) {
      const existing = await tx.classSubject.findFirst({
        where: { classId: classes.class9.id, subjectId: subject.id },
      });
      if (!existing) {
        await tx.classSubject.create({
          data: { tenantId, classId: classes.class9.id, subjectId: subject.id, isElective: false },
        });
      }
    }
  });

  // Teacher: a real staff record + linked login, class teacher of 9-A.
  const teacherPasswordHash = await argon2.hash("Teacher@12345", { type: argon2.argon2id });
  const teacherUser = await withTenant(tenantId, (tx) =>
    tx.user.upsert({
      where: { tenantId_email: { tenantId, email: "teacher@demo-school.test" } },
      update: {},
      create: {
        tenantId,
        name: "Meena Kumari",
        email: "teacher@demo-school.test",
        phone: "+919812340001",
        passwordHash: teacherPasswordHash,
        status: "ACTIVE",
      },
    })
  );
  const teacher = await withTenant(tenantId, (tx) =>
    tx.staff.upsert({
      where: { branchId_employeeNo: { branchId, employeeNo: "T001" } },
      update: {},
      create: {
        tenantId,
        branchId,
        userId: teacherUser.id,
        employeeNo: "T001",
        designation: "TGT — Mathematics",
        type: "TEACHING",
        joinedAt: new Date("2020-06-01"),
      },
    })
  );
  const roleByKey = await seedDefaultRoles(tenantId);
  await withTenant(tenantId, async (tx) => {
    const existing = await tx.userRole.findFirst({
      where: { userId: teacherUser.id, roleId: roleByKey.TEACHER, branchId },
    });
    if (!existing) {
      await tx.userRole.create({
        data: { tenantId, userId: teacherUser.id, roleId: roleByKey.TEACHER, branchId },
      });
    }
    await tx.branchMembership.upsert({
      where: { userId_branchId: { userId: teacherUser.id, branchId } },
      update: {},
      create: { tenantId, userId: teacherUser.id, branchId },
    });
    await tx.section.update({ where: { id: section9A.id }, data: { classTeacherId: teacher.id } });
    const existingAssignment = await tx.teacherAssignment.findFirst({
      where: { sessionId: session.id, staffId: teacher.id, subjectId: subjects.MATH.id, sectionId: section9A.id },
    });
    if (!existingAssignment) {
      await tx.teacherAssignment.create({
        data: {
          tenantId,
          branchId,
          sessionId: session.id,
          staffId: teacher.id,
          subjectId: subjects.MATH.id,
          sectionId: section9A.id,
        },
      });
    }
  });

  // Three students in 9-A. Aarav's guardian reuses the existing demo PARENT
  // login (so parent-app manual QA has real data); the other two get
  // phone-only guardians (no linked User) — the SMS-fallback path Unit 32
  // hardened, on real seeded data.
  const studentDefs = [
    { tag: "1", firstName: "Aarav", lastName: "Sharma", guardianPhone: "+919999999999", linkParent: true },
    { tag: "2", firstName: "Diya", lastName: "Verma", guardianPhone: "+919812340011", linkParent: false },
    { tag: "3", firstName: "Rohan", lastName: "Singh", guardianPhone: "+919812340012", linkParent: false },
  ] as const;

  const students = await withTenant(tenantId, async (tx) => {
    const created = [];
    for (const def of studentDefs) {
      const admissionNo = `000${def.tag}`;
      const student = await tx.student.upsert({
        where: { branchId_admissionNo: { branchId, admissionNo } },
        update: {},
        create: {
          tenantId,
          branchId,
          admissionNo,
          firstName: def.firstName,
          lastName: def.lastName,
          dob: new Date("2011-06-15"),
          gender: def.tag === "2" ? "F" : "M",
          address: "Patna, Bihar",
          status: "ACTIVE",
        },
      });
      const existingEnrollment = await tx.enrollment.findFirst({
        where: { studentId: student.id, sessionId: session.id },
      });
      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            tenantId,
            branchId,
            studentId: student.id,
            sessionId: session.id,
            classId: classes.class9.id,
            sectionId: section9A.id,
          },
        });
      }
      const guardian =
        (await tx.guardian.findFirst({ where: { phone: def.guardianPhone } })) ??
        (await tx.guardian.create({
          data: {
            tenantId,
            name: `${def.firstName}'s Guardian`,
            relation: "FATHER",
            phone: def.guardianPhone,
            userId: def.linkParent ? demoParentUserId : null,
          },
        }));
      const existingLink = await tx.studentGuardian.findFirst({
        where: { studentId: student.id, guardianId: guardian.id },
      });
      if (!existingLink) {
        await tx.studentGuardian.create({
          data: { tenantId, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true },
        });
      }
      created.push(student);
    }
    return created;
  });

  // A week of real attendance history (one deliberate ABSENT for demo variety).
  await withTenant(tenantId, async (tx) => {
    const days = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
    for (const day of days) {
      for (const [i, student] of students.entries()) {
        const status = day === "2026-07-22" && i === 1 ? "ABSENT" : "PRESENT";
        const existing = await tx.attendanceRecord.findFirst({
          where: { studentId: student.id, date: new Date(day), periodId: null },
        });
        if (!existing) {
          await tx.attendanceRecord.create({
            data: {
              tenantId,
              branchId,
              sessionId: session.id,
              sectionId: section9A.id,
              studentId: student.id,
              date: new Date(day),
              status,
              markedById: teacherUser.id,
              source: "WEB",
            },
          });
        }
      }
    }
  });

  // One exam, marks for every student, a published report card for Aarav.
  const { exam, examSubject } = await withTenant(tenantId, async (tx) => {
    const exam =
      (await tx.exam.findFirst({ where: { branchId, sessionId: session.id, name: "Unit Test 1" } })) ??
      (await tx.exam.create({
        data: { tenantId, branchId, sessionId: session.id, name: "Unit Test 1", type: "UNIT_TEST", gradingScheme: "MARKS" },
      }));
    const examSubject =
      (await tx.examSubject.findFirst({ where: { examId: exam.id, subjectId: subjects.MATH.id } })) ??
      (await tx.examSubject.create({
        data: { tenantId, examId: exam.id, classId: classes.class9.id, subjectId: subjects.MATH.id, maxMarks: 100, passMarks: 33 },
      }));
    return { exam, examSubject };
  });

  await withTenant(tenantId, async (tx) => {
    const marksByStudent = [82, 45, 91];
    for (const [i, student] of students.entries()) {
      await tx.marksEntry.upsert({
        where: { examSubjectId_studentId: { examSubjectId: examSubject.id, studentId: student.id } },
        update: {},
        create: {
          tenantId,
          branchId,
          examSubjectId: examSubject.id,
          studentId: student.id,
          marks: marksByStudent[i],
          enteredById: teacherUser.id,
        },
      });
    }

    const template =
      (await tx.reportCardTemplate.findFirst({ where: { branchId, name: "CBSE Default" } })) ??
      (await tx.reportCardTemplate.create({
        data: { tenantId, branchId, name: "CBSE Default", board: "CBSE", layout: {} },
      }));
    await tx.reportCard.upsert({
      where: { examId_studentId: { examId: exam.id, studentId: students[0]!.id } },
      update: {},
      create: {
        tenantId,
        branchId,
        sessionId: session.id,
        studentId: students[0]!.id,
        examId: exam.id,
        templateId: template.id,
        publishedAt: new Date(),
      },
    });
  });

  // Fees: one structure, assigned to every student; Aarav's invoice is paid
  // (with a real receipt), Diya's is still pending — a realistic mixed state.
  await withTenant(tenantId, async (tx) => {
    const feeHead =
      (await tx.feeHead.findFirst({ where: { branchId, name: "Tuition Fee" } })) ??
      (await tx.feeHead.create({ data: { tenantId, branchId, name: "Tuition Fee", type: "TUITION" } }));

    const structure =
      (await tx.feeStructure.findFirst({ where: { branchId, sessionId: session.id, name: "2026-27 Class 9" } })) ??
      (await tx.feeStructure.create({
        data: { tenantId, branchId, sessionId: session.id, classId: classes.class9.id, name: "2026-27 Class 9" },
      }));

    const existingItem = await tx.feeStructureItem.findFirst({ where: { structureId: structure.id, feeHeadId: feeHead.id } });
    if (!existingItem) {
      await tx.feeStructureItem.create({
        data: { tenantId, structureId: structure.id, feeHeadId: feeHead.id, amount: 5_000_000, frequency: "ANNUAL" },
      });
    }

    for (const student of students) {
      await tx.feeAssignment.upsert({
        where: { studentId_structureId: { studentId: student.id, structureId: structure.id } },
        update: {},
        create: { tenantId, branchId, studentId: student.id, structureId: structure.id },
      });
    }

    const paidInvoice =
      (await tx.invoice.findFirst({
        where: { studentId: students[0]!.id, sessionId: session.id, periodLabel: "Annual 2026-27" },
      })) ??
      (await tx.invoice.create({
        data: {
          tenantId,
          branchId,
          studentId: students[0]!.id,
          sessionId: session.id,
          number: await nextInvoiceNumber(tx, branchId),
          periodLabel: "Annual 2026-27",
          dueDate: new Date("2026-07-15"),
          status: "PAID",
        },
      }));
    const existingPaidItem = await tx.invoiceItem.findFirst({ where: { invoiceId: paidInvoice.id, feeHeadId: feeHead.id } });
    if (!existingPaidItem) {
      await tx.invoiceItem.create({ data: { tenantId, invoiceId: paidInvoice.id, feeHeadId: feeHead.id, amount: 5_000_000 } });
    }
    const payment =
      (await tx.payment.findFirst({ where: { invoiceId: paidInvoice.id } })) ??
      (await tx.payment.create({
        data: {
          tenantId,
          branchId,
          invoiceId: paidInvoice.id,
          studentId: students[0]!.id,
          amount: 5_000_000,
          mode: "UPI",
          status: "SUCCESS",
          receivedById: ownerUserId,
          idempotencyKey: `seed-payment-${students[0]!.id}-${paidInvoice.id}`,
        },
      }));
    const existingReceipt = await tx.receipt.findFirst({ where: { paymentId: payment.id } });
    if (!existingReceipt) {
      await tx.receipt.create({
        data: { tenantId, branchId, paymentId: payment.id, number: await nextReceiptNumber(tx, branchId) },
      });
    }

    const pendingInvoice = await tx.invoice.findFirst({
      where: { studentId: students[1]!.id, sessionId: session.id, periodLabel: "Annual 2026-27" },
    });
    if (!pendingInvoice) {
      const created = await tx.invoice.create({
        data: {
          tenantId,
          branchId,
          studentId: students[1]!.id,
          sessionId: session.id,
          number: await nextInvoiceNumber(tx, branchId),
          periodLabel: "Annual 2026-27",
          dueDate: new Date("2026-08-15"),
          status: "PENDING",
        },
      });
      await tx.invoiceItem.create({ data: { tenantId, invoiceId: created.id, feeHeadId: feeHead.id, amount: 5_000_000 } });
    }
  });

  // One announcement (school-wide), one certificate, a couple of timetable
  // periods, and one admission enquiry — rounds out every remaining module.
  await withTenant(tenantId, async (tx) => {
    const existingAnnouncement = await tx.announcement.findFirst({ where: { branchId, title: "Welcome to 2026-27!" } });
    if (!existingAnnouncement) {
      await tx.announcement.create({
        data: {
          tenantId,
          branchId,
          title: "Welcome to 2026-27!",
          body: "Classes resume Monday. Please ensure fee dues are cleared before the term begins.",
          createdById: ownerUserId,
        },
      });
    }

    const existingCertificate = await tx.certificate.findFirst({
      where: { branchId, type: "BONAFIDE", studentId: students[0]!.id },
    });
    if (!existingCertificate) {
      await tx.certificate.create({
        data: {
          tenantId,
          branchId,
          studentId: students[0]!.id,
          type: "BONAFIDE",
          number: await nextCertificateNumber(tx, branchId, "BONAFIDE"),
          issuedById: ownerUserId,
        },
      });
    }

    const existingPeriod = await tx.timetablePeriod.findFirst({
      where: { sectionId: section9A.id, dayOfWeek: 1, periodNo: 1 },
    });
    if (!existingPeriod) {
      await tx.timetablePeriod.create({
        data: {
          tenantId,
          branchId,
          sessionId: session.id,
          sectionId: section9A.id,
          dayOfWeek: 1,
          periodNo: 1,
          subjectId: subjects.MATH.id,
          staffId: teacher.id,
          room: "Room 9A",
        },
      });
    }

    const existingHomework = await tx.homework.findFirst({ where: { sectionId: section9A.id, title: "Algebra worksheet" } });
    if (!existingHomework) {
      await tx.homework.create({
        data: {
          tenantId,
          branchId,
          sectionId: section9A.id,
          subjectId: subjects.MATH.id,
          title: "Algebra worksheet",
          description: "Complete exercises 4.1–4.3 from the textbook.",
          dueDate: new Date("2026-07-30"),
          createdById: teacherUser.id,
        },
      });
    }

    const existingEnquiry = await tx.enquiry.findFirst({ where: { branchId, childName: "Kabir Singh" } });
    if (!existingEnquiry) {
      await tx.enquiry.create({
        data: {
          tenantId,
          branchId,
          childName: "Kabir Singh",
          guardianName: "Suresh Singh",
          phone: "+919812340099",
          source: "walk-in",
        },
      });
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
