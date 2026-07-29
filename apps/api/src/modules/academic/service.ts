import { withTenant } from "@vidyut/db";
import type {
  AddElectiveOptionInput,
  ChooseElectiveInput,
  CreateBranchInput,
  CreateClassInput,
  CreateClassSubjectInput,
  CreateElectiveGroupInput,
  CreateHouseInput,
  CreateSectionInput,
  CreateSessionInput,
  CreateSubjectInput,
  CreateTeacherAssignmentInput,
  ListBranchesQueryInput,
  ListClassesQueryInput,
  ListElectiveGroupsQueryInput,
  ListHousesQueryInput,
  ListSectionsQueryInput,
  ListSessionsQueryInput,
  ListSubjectsQueryInput,
  ListTeacherAssignmentsQueryInput,
  PatchBranchInput,
  PatchClassInput,
  PatchSectionInput,
  PatchSessionInput,
  PatchSubjectInput,
  RolloverCommitInput,
  RolloverPreviewInput,
} from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getStaffByUserId } from "../staff/service";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

// ---------------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------------

export async function createSession(auth: RequestAuth, input: CreateSessionInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    if (input.isCurrent) {
      await tx.academicSession.updateMany({
        where: { branchId: input.branchId, isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return tx.academicSession.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent,
      },
    });
  });
}

export async function listSessions(auth: RequestAuth, query: ListSessionsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = { branchId: query.branchId, deletedAt: null };
    const [items, total] = await Promise.all([
      tx.academicSession.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.academicSession.count({ where }),
    ]);
    return { items, total };
  });
}

async function getSessionOrThrow(auth: RequestAuth, id: string) {
  const session = await withTenant(auth.tenantId, (tx) => tx.academicSession.findUnique({ where: { id } }));
  if (!session || session.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.sessionNotFound");
  }
  return session;
}

export async function patchSession(auth: RequestAuth, id: string, input: PatchSessionInput) {
  const session = await getSessionOrThrow(auth, id);
  assertBranchAccess(auth, session.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    if (input.isCurrent) {
      await tx.academicSession.updateMany({
        where: { branchId: session.branchId, isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }
    return tx.academicSession.update({ where: { id }, data: input });
  });
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function createClass(auth: RequestAuth, input: CreateClassInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.class.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name, order: input.order },
    })
  );
}

export async function listClasses(auth: RequestAuth, query: ListClassesQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = { branchId: query.branchId, deletedAt: null };
    const [items, total] = await Promise.all([
      tx.class.findMany({
        where,
        orderBy: { order: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.class.count({ where }),
    ]);
    return { items, total };
  });
}

async function getClassOrThrow(auth: RequestAuth, id: string) {
  const cls = await withTenant(auth.tenantId, (tx) => tx.class.findUnique({ where: { id } }));
  if (!cls || cls.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.classNotFound");
  }
  return cls;
}

export async function patchClass(auth: RequestAuth, id: string, input: PatchClassInput) {
  const cls = await getClassOrThrow(auth, id);
  assertBranchAccess(auth, cls.branchId);

  return withTenant(auth.tenantId, (tx) => tx.class.update({ where: { id }, data: input }));
}

export async function deleteClass(auth: RequestAuth, id: string): Promise<void> {
  const cls = await getClassOrThrow(auth, id);
  assertBranchAccess(auth, cls.branchId);

  await withTenant(auth.tenantId, (tx) => tx.class.update({ where: { id }, data: { deletedAt: new Date() } }));
}

// ---------------------------------------------------------------------------
// Sections (nested under a class)
// ---------------------------------------------------------------------------

export async function createSection(auth: RequestAuth, classId: string, input: CreateSectionInput) {
  const cls = await getClassOrThrow(auth, classId);
  assertBranchAccess(auth, cls.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.section.create({
      data: {
        tenantId: auth.tenantId,
        branchId: cls.branchId,
        classId,
        name: input.name,
        capacity: input.capacity,
      },
    })
  );
}

export async function listSections(auth: RequestAuth, classId: string, query: ListSectionsQueryInput) {
  const cls = await getClassOrThrow(auth, classId);
  assertBranchAccess(auth, cls.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = { classId, deletedAt: null };
    const [items, total] = await Promise.all([
      tx.section.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.section.count({ where }),
    ]);
    return { items, total };
  });
}

async function getSectionOrThrow(auth: RequestAuth, classId: string, id: string) {
  const section = await withTenant(auth.tenantId, (tx) => tx.section.findUnique({ where: { id } }));
  if (!section || section.deletedAt || section.classId !== classId) {
    throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
  }
  return section;
}

export async function patchSection(
  auth: RequestAuth,
  classId: string,
  id: string,
  input: PatchSectionInput
) {
  const section = await getSectionOrThrow(auth, classId, id);
  assertBranchAccess(auth, section.branchId);

  return withTenant(auth.tenantId, (tx) => tx.section.update({ where: { id }, data: input }));
}

export async function deleteSection(auth: RequestAuth, classId: string, id: string): Promise<void> {
  const section = await getSectionOrThrow(auth, classId, id);
  assertBranchAccess(auth, section.branchId);

  await withTenant(auth.tenantId, (tx) =>
    tx.section.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function createSubject(auth: RequestAuth, input: CreateSubjectInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.subject.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        name: input.name,
        code: input.code,
        type: input.type,
      },
    })
  );
}

export async function listSubjects(auth: RequestAuth, query: ListSubjectsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = { branchId: query.branchId, deletedAt: null };
    const [items, total] = await Promise.all([
      tx.subject.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.subject.count({ where }),
    ]);
    return { items, total };
  });
}

async function getSubjectOrThrow(auth: RequestAuth, id: string) {
  const subject = await withTenant(auth.tenantId, (tx) => tx.subject.findUnique({ where: { id } }));
  if (!subject || subject.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.subjectNotFound");
  }
  return subject;
}

export async function patchSubject(auth: RequestAuth, id: string, input: PatchSubjectInput) {
  const subject = await getSubjectOrThrow(auth, id);
  assertBranchAccess(auth, subject.branchId);

  return withTenant(auth.tenantId, (tx) => tx.subject.update({ where: { id }, data: input }));
}

export async function deleteSubject(auth: RequestAuth, id: string): Promise<void> {
  const subject = await getSubjectOrThrow(auth, id);
  assertBranchAccess(auth, subject.branchId);

  await withTenant(auth.tenantId, (tx) =>
    tx.subject.update({ where: { id }, data: { deletedAt: new Date() } })
  );
}

// ---------------------------------------------------------------------------
// Class <-> subject assignment (nested under a class)
// ---------------------------------------------------------------------------

export async function createClassSubject(
  auth: RequestAuth,
  classId: string,
  input: CreateClassSubjectInput
) {
  const cls = await getClassOrThrow(auth, classId);
  assertBranchAccess(auth, cls.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.classSubject.create({
      data: {
        tenantId: auth.tenantId,
        classId,
        subjectId: input.subjectId,
        isElective: input.isElective,
      },
    })
  );
}

export async function listClassSubjects(auth: RequestAuth, classId: string) {
  const cls = await getClassOrThrow(auth, classId);
  assertBranchAccess(auth, cls.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.classSubject.findMany({ where: { classId }, include: { subject: true } })
  );
}

export async function deleteClassSubject(auth: RequestAuth, classId: string, subjectId: string): Promise<void> {
  const cls = await getClassOrThrow(auth, classId);
  assertBranchAccess(auth, cls.branchId);

  const link = await withTenant(auth.tenantId, (tx) =>
    tx.classSubject.findUnique({ where: { classId_subjectId: { classId, subjectId } } })
  );
  if (!link) {
    throw new AppError("NOT_FOUND", "academic.errors.classSubjectNotFound");
  }

  await withTenant(auth.tenantId, (tx) =>
    tx.classSubject.delete({ where: { classId_subjectId: { classId, subjectId } } })
  );
}

// ---------------------------------------------------------------------------
// Teacher-subject-section assignment (Unit 09 — deferred by Unit 06)
// ---------------------------------------------------------------------------

export async function createTeacherAssignment(auth: RequestAuth, input: CreateTeacherAssignmentInput) {
  const section = await withTenant(auth.tenantId, (tx) => tx.section.findUnique({ where: { id: input.sectionId } }));
  if (!section || section.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.sectionNotFound");
  }
  assertBranchAccess(auth, section.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const [staff, subject, session] = await Promise.all([
      tx.staff.findUnique({ where: { id: input.staffId } }),
      tx.subject.findUnique({ where: { id: input.subjectId } }),
      tx.academicSession.findUnique({ where: { id: input.sessionId } }),
    ]);
    if (!staff || staff.deletedAt || staff.branchId !== section.branchId) {
      throw new AppError("VALIDATION_ERROR", "staff.errors.staffNotFoundInBranch");
    }
    if (!subject || subject.deletedAt || subject.branchId !== section.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.subjectNotFoundInBranch");
    }
    if (!session || session.branchId !== section.branchId) {
      throw new AppError("VALIDATION_ERROR", "academic.errors.sessionNotFoundInBranch");
    }

    return tx.teacherAssignment.create({
      data: {
        tenantId: auth.tenantId,
        branchId: section.branchId,
        sessionId: input.sessionId,
        staffId: input.staffId,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
      },
    });
  });
}

export async function listTeacherAssignments(auth: RequestAuth, query: ListTeacherAssignmentsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, async (tx) => {
    const where = {
      branchId: query.branchId,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
    };
    const [items, total] = await Promise.all([
      tx.teacherAssignment.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.teacherAssignment.count({ where }),
    ]);
    return { items, total };
  });
}

/**
 * Self-scoped "my sections" (Unit 26) — resolves the caller's own Staff row
 * and returns their assignments directly, closing the gap Unit 16's
 * TeacherAttendanceScreen flagged (no self-derived section lookup existed;
 * only a staffId-filterable list for staff who already know their own id).
 */
export async function listMyTeacherAssignments(auth: RequestAuth) {
  const staff = await getStaffByUserId(auth.tenantId, auth.userId);
  if (!staff) {
    return [];
  }
  return withTenant(auth.tenantId, (tx) =>
    tx.teacherAssignment.findMany({
      where: { staffId: staff.id },
      include: { section: { include: { class: true } }, subject: true },
    })
  );
}

export async function deleteTeacherAssignment(auth: RequestAuth, id: string): Promise<void> {
  const assignment = await withTenant(auth.tenantId, (tx) => tx.teacherAssignment.findUnique({ where: { id } }));
  if (!assignment) {
    throw new AppError("NOT_FOUND", "academic.errors.teacherAssignmentNotFound");
  }
  assertBranchAccess(auth, assignment.branchId);

  await withTenant(auth.tenantId, (tx) => tx.teacherAssignment.delete({ where: { id } }));
}

// ---------------------------------------------------------------------------
// Unit 33: Academic-Year Rollover
// ---------------------------------------------------------------------------

async function assertSessionsBelongToBranch(
  auth: RequestAuth,
  branchId: string,
  fromSessionId: string,
  toSessionId: string
) {
  return withTenant(auth.tenantId, async (tx) => {
    const [fromSession, toSession] = await Promise.all([
      tx.academicSession.findUnique({ where: { id: fromSessionId } }),
      tx.academicSession.findUnique({ where: { id: toSessionId } }),
    ]);
    if (!fromSession || fromSession.branchId !== branchId) {
      throw new AppError("NOT_FOUND", "academic.errors.sessionNotFound");
    }
    if (!toSession || toSession.branchId !== branchId) {
      throw new AppError("NOT_FOUND", "academic.errors.sessionNotFound");
    }
    return { fromSession, toSession };
  });
}

/**
 * Preview never writes anything (Unit 33's Open Question 3) — proposes each
 * currently-enrolled student's default next class by `Class.order + 1`
 * within the same branch. A student already in the branch's highest-order
 * class gets `targetClassId: null` (no default — staff must decide
 * REPEAT/WITHDRAW manually, e.g. a graduating class).
 */
export async function previewRollover(auth: RequestAuth, input: RolloverPreviewInput) {
  assertBranchAccess(auth, input.branchId);
  await assertSessionsBelongToBranch(auth, input.branchId, input.fromSessionId, input.toSessionId);

  return withTenant(auth.tenantId, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: { sessionId: input.fromSessionId, branchId: input.branchId, status: "ACTIVE" },
      include: { student: true, class: true },
    });
    const classes = await tx.class.findMany({ where: { branchId: input.branchId, deletedAt: null } });
    const classByOrder = new Map(classes.map((c) => [c.order, c]));

    return enrollments.map((enrollment) => {
      const nextClass = classByOrder.get(enrollment.class.order + 1) ?? null;
      return {
        studentId: enrollment.studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        currentClassId: enrollment.classId,
        currentClassName: enrollment.class.name,
        proposedClassId: nextClass?.id ?? null,
        proposedClassName: nextClass?.name ?? null,
      };
    });
  });
}

/**
 * Commit creates new Enrollment rows only for PROMOTE/REPEAT decisions
 * (old Enrollment/AttendanceRecord/MarksEntry/ReportCard rows are never
 * touched — Unit 33's own scope). Idempotent: `Enrollment`'s existing
 * `@@unique([studentId, sessionId])` constraint means re-running commit for
 * an already-migrated student is a clean no-op, not a duplicate row.
 * WITHDRAW writes nothing. Flips `isCurrent` only after every decision is
 * processed, so a failure partway through never leaves both sessions (or
 * neither) marked current.
 */
export async function commitRollover(auth: RequestAuth, input: RolloverCommitInput) {
  assertBranchAccess(auth, input.branchId);
  await assertSessionsBelongToBranch(auth, input.branchId, input.fromSessionId, input.toSessionId);

  const results = await withTenant(auth.tenantId, async (tx) => {
    const outcomes: { studentId: string; status: "MIGRATED" | "ALREADY_MIGRATED" | "WITHDRAWN" }[] = [];

    for (const decision of input.decisions) {
      if (decision.action === "WITHDRAW") {
        outcomes.push({ studentId: decision.studentId, status: "WITHDRAWN" });
        continue;
      }

      // Check-then-create rather than catching a unique-constraint error:
      // withTenant() runs the whole commit in one Postgres transaction, and
      // a failed statement (even one caught in JS) poisons that transaction
      // for every subsequent statement — a real pitfall, not a hypothetical
      // one (caught by this unit's own idempotency test).
      const existing = await tx.enrollment.findUnique({
        where: { studentId_sessionId: { studentId: decision.studentId, sessionId: input.toSessionId } },
      });
      if (existing) {
        outcomes.push({ studentId: decision.studentId, status: "ALREADY_MIGRATED" });
        continue;
      }

      await tx.enrollment.create({
        data: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          studentId: decision.studentId,
          sessionId: input.toSessionId,
          classId: decision.targetClassId!,
          sectionId: decision.targetSectionId!,
        },
      });
      outcomes.push({ studentId: decision.studentId, status: "MIGRATED" });
    }

    await tx.academicSession.update({ where: { id: input.fromSessionId }, data: { isCurrent: false } });
    await tx.academicSession.update({ where: { id: input.toSessionId }, data: { isCurrent: true } });

    return outcomes;
  });

  return { outcomes: results };
}

// ---------------------------------------------------------------------------
// Unit 36 — Branch management (closes the `branch.manage` RBAC gap; Unit 06
// only ever created branches via seed/platform-provisioning). Branches are
// never deleted, only deactivated (`isActive`), matching every other
// soft-delete convention in this codebase.
// ---------------------------------------------------------------------------

export async function createBranch(auth: RequestAuth, input: CreateBranchInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.branch.create({
      data: {
        tenantId: auth.tenantId,
        name: input.name,
        code: input.code,
        address: input.address,
        board: input.board,
        logoUrl: input.logoUrl,
      },
    })
  );
}

export async function listBranches(auth: RequestAuth, query: ListBranchesQueryInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const where = { deletedAt: null } as const;
    const [items, total] = await Promise.all([
      tx.branch.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.branch.count({ where }),
    ]);
    return { items, total };
  });
}

async function getBranchOrThrow(auth: RequestAuth, id: string) {
  const branch = await withTenant(auth.tenantId, (tx) => tx.branch.findUnique({ where: { id } }));
  if (!branch || branch.deletedAt) {
    throw new AppError("NOT_FOUND", "academic.errors.branchNotFound");
  }
  return branch;
}

export async function patchBranch(auth: RequestAuth, id: string, input: PatchBranchInput) {
  const branch = await getBranchOrThrow(auth, id);
  assertBranchAccess(auth, branch.id);

  return withTenant(auth.tenantId, (tx) => tx.branch.update({ where: { id }, data: input }));
}

// ---------------------------------------------------------------------------
// Unit 43 — Academic Structure Depth (elective baskets, houses)
//
// Streams (Science/Commerce/Arts) resolved with the user: a separate Class
// row per stream (e.g. "Class 11 Science") — zero new schema, just a
// convention already representable today.
// ---------------------------------------------------------------------------

export async function createElectiveGroup(auth: RequestAuth, input: CreateElectiveGroupInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.electiveGroup.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, classId: input.classId, name: input.name },
    })
  );
}

export async function listElectiveGroups(auth: RequestAuth, query: ListElectiveGroupsQueryInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.electiveGroup.findMany({
      where: { classId: query.classId },
      include: { options: true },
      orderBy: { name: "asc" },
    })
  );
}

async function getElectiveGroupOrThrow(auth: RequestAuth, id: string) {
  const group = await withTenant(auth.tenantId, (tx) => tx.electiveGroup.findUnique({ where: { id } }));
  if (!group) {
    throw new AppError("NOT_FOUND", "academic.errors.electiveGroupNotFound");
  }
  return group;
}

export async function addElectiveOption(auth: RequestAuth, id: string, input: AddElectiveOptionInput) {
  const group = await getElectiveGroupOrThrow(auth, id);
  assertBranchAccess(auth, group.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.classSubject.update({ where: { id: input.classSubjectId }, data: { electiveGroupId: id, isElective: true } })
  );
}

/** A student picks one option from the group — one choice per group, upsert on re-pick. */
export async function chooseElective(auth: RequestAuth, id: string, input: ChooseElectiveInput) {
  const group = await getElectiveGroupOrThrow(auth, id);
  assertBranchAccess(auth, group.branchId);

  const option = await withTenant(auth.tenantId, (tx) => tx.classSubject.findUnique({ where: { id: input.classSubjectId } }));
  if (!option || option.electiveGroupId !== id) {
    throw new AppError("VALIDATION_ERROR", "academic.errors.optionNotInGroup");
  }

  return withTenant(auth.tenantId, (tx) =>
    tx.studentElectiveChoice.upsert({
      where: { studentId_electiveGroupId: { studentId: input.studentId, electiveGroupId: id } },
      update: { classSubjectId: input.classSubjectId },
      create: {
        tenantId: auth.tenantId,
        branchId: group.branchId,
        studentId: input.studentId,
        electiveGroupId: id,
        classSubjectId: input.classSubjectId,
      },
    })
  );
}

export async function createHouse(auth: RequestAuth, input: CreateHouseInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.house.create({ data: { tenantId: auth.tenantId, branchId: input.branchId, name: input.name, color: input.color } })
  );
}

export async function listHouses(auth: RequestAuth, query: ListHousesQueryInput) {
  assertBranchAccess(auth, query.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.house.findMany({ where: { branchId: query.branchId }, orderBy: { name: "asc" } })
  );
}

/** A house's roster — students currently tagged with this house. */
export async function getHouseRoster(auth: RequestAuth, id: string) {
  const house = await withTenant(auth.tenantId, (tx) => tx.house.findUnique({ where: { id } }));
  if (!house) {
    throw new AppError("NOT_FOUND", "academic.errors.houseNotFound");
  }
  assertBranchAccess(auth, house.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.student.findMany({
      where: { houseId: id, deletedAt: null },
      select: { id: true, admissionNo: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    })
  );
}
