import { Prisma, withTenant } from "@vidyut/db";
import type { CreateGuardianInput, LinkGuardianInput, ListGuardiansQueryInput, PatchGuardianInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import { resolveGuardianStudentIds } from "../../core/guards/require-self";
import type { RequestAuth } from "../../core/guards/types";
import { generateAndStoreOtp } from "../../core/auth/otp";
import { enqueue } from "../../core/jobs";

const isDev = process.env.NODE_ENV !== "production";

export async function createGuardian(auth: RequestAuth, input: CreateGuardianInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.guardian.create({
      data: {
        tenantId: auth.tenantId,
        name: input.name,
        relation: input.relation,
        phone: input.phone,
        email: input.email,
        occupation: input.occupation,
      },
    })
  );
}

export async function listGuardians(auth: RequestAuth, query: ListGuardiansQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const where: Prisma.GuardianWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      tx.guardian.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.guardian.count({ where }),
    ]);
    return { items, total };
  });
}

async function getGuardianOrThrow(auth: RequestAuth, id: string) {
  const guardian = await withTenant(auth.tenantId, (tx) => tx.guardian.findUnique({ where: { id } }));
  if (!guardian) {
    throw new AppError("NOT_FOUND", "guardian.errors.notFound");
  }
  return guardian;
}

export async function getGuardian(auth: RequestAuth, id: string) {
  return getGuardianOrThrow(auth, id);
}

export async function patchGuardian(auth: RequestAuth, id: string, input: PatchGuardianInput) {
  await getGuardianOrThrow(auth, id);
  return withTenant(auth.tenantId, (tx) => tx.guardian.update({ where: { id }, data: input }));
}

async function getStudentOrThrow(auth: RequestAuth, studentId: string) {
  const student = await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: studentId } }));
  if (!student || student.deletedAt) {
    throw new AppError("NOT_FOUND", "student.errors.notFound");
  }
  return student;
}

export async function linkGuardianToStudent(
  auth: RequestAuth,
  studentId: string,
  input: LinkGuardianInput
) {
  const student = await getStudentOrThrow(auth, studentId);
  if (!branchAccessAllowed(auth, student.branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
  await getGuardianOrThrow(auth, input.guardianId);

  return withTenant(auth.tenantId, (tx) =>
    tx.studentGuardian.create({
      data: {
        tenantId: auth.tenantId,
        studentId,
        guardianId: input.guardianId,
        isPrimary: input.isPrimary,
        canPay: input.canPay,
      },
    })
  );
}

export async function unlinkGuardianFromStudent(
  auth: RequestAuth,
  studentId: string,
  guardianId: string
): Promise<void> {
  const student = await getStudentOrThrow(auth, studentId);
  if (!branchAccessAllowed(auth, student.branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }

  const link = await withTenant(auth.tenantId, (tx) =>
    tx.studentGuardian.findUnique({ where: { studentId_guardianId: { studentId, guardianId } } })
  );
  if (!link) {
    throw new AppError("NOT_FOUND", "guardian.errors.linkNotFound");
  }

  await withTenant(auth.tenantId, (tx) =>
    tx.studentGuardian.delete({ where: { studentId_guardianId: { studentId, guardianId } } })
  );
}

/**
 * Unit 39 (DPDP) — `inviteGuardianSchema` requires `consent === true` before
 * this runs; `Guardian.consentedAt` is only ever set here, from a real
 * confirmed checkbox, never backfilled or assumed for existing rows.
 */
export async function inviteGuardian(auth: RequestAuth, guardianId: string) {
  const guardian = await getGuardianOrThrow(auth, guardianId);

  await withTenant(auth.tenantId, (tx) =>
    tx.guardian.update({ where: { id: guardianId }, data: { consentedAt: new Date() } })
  );

  const userId = await withTenant(auth.tenantId, async (tx) => {
    if (guardian.userId) {
      return guardian.userId;
    }

    const existingUser = await tx.user.findUnique({
      where: { tenantId_phone: { tenantId: auth.tenantId, phone: guardian.phone } },
    });

    const user =
      existingUser ??
      (await tx.user.create({
        data: { tenantId: auth.tenantId, name: guardian.name, phone: guardian.phone, status: "ACTIVE" },
      }));

    if (!existingUser) {
      const parentRole = await tx.role.findFirst({ where: { tenantId: auth.tenantId, key: "PARENT" } });
      if (parentRole) {
        await tx.userRole.create({
          data: { tenantId: auth.tenantId, userId: user.id, roleId: parentRole.id, branchId: null },
        });
      }
    }

    await tx.guardian.update({ where: { id: guardianId }, data: { userId: user.id } });
    return user.id;
  });

  // The "send" step runs as a background job (AGENTS.md invariant #2), not
  // inline here — only OTP generation/storage happens synchronously.
  const code = await generateAndStoreOtp(`${auth.tenantId}:${guardian.phone}`);
  await enqueue("guardian.invite", { phone: guardian.phone, code });

  return { userId, phone: guardian.phone, ...(isDev ? { devCode: code } : {}) };
}

export async function getMyChildren(auth: RequestAuth) {
  const studentIds = await resolveGuardianStudentIds(auth.tenantId, auth.userId);
  if (studentIds.length === 0) {
    return [];
  }

  return withTenant(auth.tenantId, async (tx) => {
    const students = await tx.student.findMany({
      where: { id: { in: studentIds }, deletedAt: null },
    });

    const currentEnrollments = await tx.enrollment.findMany({
      where: { studentId: { in: studentIds }, session: { isCurrent: true } },
      include: { class: true, section: true },
    });
    const enrollmentByStudentId = new Map(currentEnrollments.map((e) => [e.studentId, e]));

    return students.map((student) => {
      const enrollment = enrollmentByStudentId.get(student.id);
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: enrollment?.class.name ?? null,
        sectionName: enrollment?.section.name ?? null,
      };
    });
  });
}
