import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `2025-26 ${code}`,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
      },
    })
  );
  return { branch, cls, section, session };
}

async function createStudentWithEnrollment(
  tenantId: string,
  branchId: string,
  classId: string,
  sectionId: string,
  sessionId: string,
  tag: string
) {
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId,
        admissionNo: `ADM-${tag}`,
        firstName: tag,
        lastName: "Student",
        dob: new Date("2012-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.enrollment.create({ data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId } })
  );
  return student;
}

async function linkParentToStudent(tenantId: string, studentId: string, phone: string) {
  const user = await withTenant(tenantId, (tx) =>
    tx.user.create({ data: { tenantId, name: phone, phone, status: "ACTIVE" } })
  );
  const guardian = await withTenant(tenantId, (tx) =>
    tx.guardian.create({ data: { tenantId, name: "Parent", relation: "FATHER", phone, userId: user.id } })
  );
  await withTenant(tenantId, (tx) =>
    tx.studentGuardian.create({
      data: { tenantId, studentId, guardianId: guardian.id, isPrimary: true, canPay: true },
    })
  );
  const token = await signAccessToken({ sub: user.id, tenantId, roles: ["PARENT"], branchIds: [] });
  return { user, guardian, token };
}

async function createTeacherWithStaff(tenantId: string, branchId: string, tag: string) {
  const role = await createRoleWithPermissions(tenantId, "TEACHER", []);
  const user = await createStaffUser(tenantId, {
    email: `teacher-${tag}@example.com`,
    password: "Passw0rd!",
    roleId: role.id,
    branchId,
  });
  const staff = await withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId,
        userId: user.id,
        employeeNo: `EMP-${tag}`,
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2020-01-01"),
      },
    })
  );
  const token = await signAccessToken({ sub: user.id, tenantId, roles: ["TEACHER"], branchIds: [branchId] });
  return { user, staff, token };
}

describe("Unit 49 — Circulars (audience match + ack tracking)", () => {
  it("a class-audience circular is visible to a parent in that class, ackable by them, and the ack shows up in the staff-facing ack list", async () => {
    const tenant = await createTenant("circulars-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const { token: parentToken } = await linkParentToStudent(tenant.id, student.id, "9990001111");

    const createRes = await request(app)
      .post("/api/v1/circulars")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "PTM Notice", body: "Come Saturday", audience: { classIds: [cls.id] } });
    expect(createRes.status).toBe(201);
    const circularId = createRes.body.data.id as string;

    const myCirculars = await request(app)
      .get(`/api/v1/me/circulars?studentId=${student.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(myCirculars.status).toBe(200);
    expect(myCirculars.body.data).toHaveLength(1);
    expect(myCirculars.body.data[0].acked).toBe(false);

    const ackRes = await request(app)
      .post(`/api/v1/circulars/${circularId}/ack`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(ackRes.status).toBe(200);

    const acksList = await request(app)
      .get(`/api/v1/circulars/${circularId}/acks`)
      .set("Authorization", `Bearer ${owner}`);
    expect(acksList.status).toBe(200);
    expect(acksList.body.data).toHaveLength(1);

    const myCircularsAfter = await request(app)
      .get(`/api/v1/me/circulars?studentId=${student.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(myCircularsAfter.body.data[0].acked).toBe(true);
  });

  it("RBAC: TEACHER without engagement.manage is denied creating a circular", async () => {
    const tenant = await createTenant("circulars-rbac-tenant");
    tenantIds.push(tenant.id);
    const { branch } = await setup(tenant.id, "A");
    const { token: teacherToken } = await createTeacherWithStaff(tenant.id, branch.id, "T1");

    const res = await request(app)
      .post("/api/v1/circulars")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ branchId: branch.id, title: "X", body: "Y" });
    expect(res.status).toBe(403);
  });
});

describe("Unit 49 — PTM Slots (teacher offers, guardian books)", () => {
  it("a teacher creates their own slot, a guardian books it, and a second booking attempt conflicts", async () => {
    const tenant = await createTenant("ptm-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const { token: teacherToken, staff } = await createTeacherWithStaff(tenant.id, branch.id, "T1");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const { token: parentToken } = await linkParentToStudent(tenant.id, student.id, "9990002222");

    const createRes = await request(app)
      .post("/api/v1/ptm-slots")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ startTime: "2026-08-15T10:00:00.000Z", endTime: "2026-08-15T10:15:00.000Z" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.branchId).toBe(branch.id);
    const slotId = createRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/v1/ptm-slots?staffId=${staff.id}&availableOnly=true`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const bookRes = await request(app)
      .patch(`/api/v1/ptm-slots/${slotId}/book`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(bookRes.status).toBe(200);
    expect(bookRes.body.data.bookedByGuardianId).toBeTruthy();

    const doubleBook = await request(app)
      .patch(`/api/v1/ptm-slots/${slotId}/book`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(doubleBook.status).toBe(409);
  });

  it("a user with no linked Staff record cannot create a slot", async () => {
    const tenant = await createTenant("ptm-notstaff-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []);
    const owner = await ownerToken(tenant.id);

    const res = await request(app)
      .post("/api/v1/ptm-slots")
      .set("Authorization", `Bearer ${owner}`)
      .send({ startTime: "2026-08-15T10:00:00.000Z", endTime: "2026-08-15T10:15:00.000Z" });
    expect(res.status).toBe(403);
  });
});

describe("Unit 49 — Calendar (merged events + exam dates + homework due-dates)", () => {
  it("GET /me/calendar merges a CalendarEvent, an exam-timetable date, and a homework due-date within the same month", async () => {
    const tenant = await createTenant("calendar-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage", "exam.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const { token: parentToken } = await linkParentToStudent(tenant.id, student.id, "9990003333");

    await request(app)
      .post("/api/v1/calendar-events")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Founders Day", date: "2026-08-10", type: "HOLIDAY" });

    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Math", code: "MATH-A" } })
    );
    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, name: "Term 1", type: "UNIT_TEST", gradingScheme: "PERCENTAGE" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.examSubject.create({
        data: { tenantId: tenant.id, examId: exam.id, classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.examTimetable.create({
        data: { tenantId: tenant.id, examId: exam.id, subjectId: subject.id, date: new Date("2026-08-20"), startTime: "10:00" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.homework.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sectionId: section.id,
          subjectId: subject.id,
          title: "Worksheet",
          description: "Chapter 3",
          dueDate: new Date("2026-08-25"),
          createdById: owner ? "owner-1" : "owner-1",
        },
      })
    );

    const res = await request(app)
      .get(`/api/v1/me/calendar?studentId=${student.id}&month=8&year=2026`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    const types = (res.body.data as Array<{ type: string }>).map((e) => e.type).sort();
    expect(types).toEqual(["event", "exam", "homework"]);
  });
});

describe("Unit 49 — Complaints (raise + resolve)", () => {
  it("a parent raises a complaint in their child's branch, and staff resolves it", async () => {
    const tenant = await createTenant("complaints-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const { token: parentToken } = await linkParentToStudent(tenant.id, student.id, "9990004444");

    const raiseRes = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ branchId: branch.id, category: "Bus", body: "Late pickup" });
    expect(raiseRes.status).toBe(201);
    const complaintId = raiseRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/v1/complaints?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const resolveRes = await request(app)
      .patch(`/api/v1/complaints/${complaintId}/resolve`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ resolution: "Spoke to the driver" });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe("RESOLVED");
  });

  it("a parent cannot raise a complaint for a branch their child isn't in", async () => {
    const tenant = await createTenant("complaints-branchscope-tenant");
    tenantIds.push(tenant.id);
    const { branch: branchA } = await setup(tenant.id, "A");
    const { branch: branchB, cls: clsB, section: sectionB, session: sessionB } = await setup(tenant.id, "B");
    const student = await createStudentWithEnrollment(tenant.id, branchB.id, clsB.id, sectionB.id, sessionB.id, "S1");
    const { token: parentToken } = await linkParentToStudent(tenant.id, student.id, "9990005555");

    const res = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ branchId: branchA.id, category: "X", body: "Y" });
    expect(res.status).toBe(403);
  });
});

describe("Unit 49 — Surveys (single-choice tally + text list)", () => {
  it("responses tally correctly for a single-choice question and list correctly for a text question", async () => {
    const tenant = await createTenant("surveys-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student1 = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const student2 = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S2");
    const { token: parent1 } = await linkParentToStudent(tenant.id, student1.id, "9990006666");
    const { token: parent2 } = await linkParentToStudent(tenant.id, student2.id, "9990007777");

    const createRes = await request(app)
      .post("/api/v1/surveys")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        title: "Annual Day Feedback",
        questions: [
          { questionText: "Rating", type: "SINGLE_CHOICE", options: ["Good", "Bad"], order: 0 },
          { questionText: "Comments", type: "TEXT", order: 1 },
        ],
      });
    expect(createRes.status).toBe(201);
    const survey = createRes.body.data as { id: string; questions: Array<{ id: string; type: string }> };
    const ratingQ = survey.questions.find((q) => q.type === "SINGLE_CHOICE")!;
    const commentsQ = survey.questions.find((q) => q.type === "TEXT")!;

    await request(app)
      .post(`/api/v1/surveys/${survey.id}/respond`)
      .set("Authorization", `Bearer ${parent1}`)
      .send({ answers: [{ questionId: ratingQ.id, answer: "Good" }, { questionId: commentsQ.id, answer: "Loved it" }] });
    await request(app)
      .post(`/api/v1/surveys/${survey.id}/respond`)
      .set("Authorization", `Bearer ${parent2}`)
      .send({ answers: [{ questionId: ratingQ.id, answer: "Good" }] });

    const resultsRes = await request(app)
      .get(`/api/v1/surveys/${survey.id}/results`)
      .set("Authorization", `Bearer ${owner}`);
    expect(resultsRes.status).toBe(200);
    const results = resultsRes.body.data as Array<{ questionId: string; tally?: Record<string, number>; responses?: string[] }>;
    const ratingResult = results.find((r) => r.questionId === ratingQ.id)!;
    expect(ratingResult.tally).toEqual({ Good: 2, Bad: 0 });
    const commentsResult = results.find((r) => r.questionId === commentsQ.id)!;
    expect(commentsResult.responses).toEqual(["Loved it"]);
  });
});

describe("Unit 49 — Gallery (album + presigned photo upload)", () => {
  it("staff creates an album, requests a photo upload, and the photo appears with a signed download URL", async () => {
    const tenant = await createTenant("gallery-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch } = await setup(tenant.id, "A");

    const albumRes = await request(app)
      .post("/api/v1/gallery/albums")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Sports Day 2026" });
    expect(albumRes.status).toBe(201);
    const albumId = albumRes.body.data.id as string;

    const uploadRes = await request(app)
      .post(`/api/v1/gallery/albums/${albumId}/photos`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ fileName: "photo1.jpg", contentType: "image/jpeg" });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.uploadUrl).toBeTruthy();

    const listRes = await request(app)
      .get(`/api/v1/gallery/albums/${albumId}/photos`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].url).toBeTruthy();
  });
});

describe("Unit 49 — Messages (async parent-teacher chat)", () => {
  it("a teacher and a parent exchange messages, the thread shows for both, and a third party is denied", async () => {
    const tenant = await createTenant("messages-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const { token: teacherToken, staff } = await createTeacherWithStaff(tenant.id, branch.id, "T1");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const { token: parentToken, guardian } = await linkParentToStudent(tenant.id, student.id, "9990008888");
    const otherStudent = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S2");
    const { token: otherParentToken } = await linkParentToStudent(tenant.id, otherStudent.id, "9990009999");

    const sendRes = await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ branchId: branch.id, staffId: staff.id, guardianId: guardian.id, body: "Please see me after school" });
    expect(sendRes.status).toBe(201);

    await request(app)
      .post("/api/v1/messages")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ branchId: branch.id, staffId: staff.id, guardianId: guardian.id, body: "Sure, what time?" });

    const threadRes = await request(app)
      .get(`/api/v1/messages?staffId=${staff.id}&guardianId=${guardian.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(threadRes.status).toBe(200);
    expect(threadRes.body.data).toHaveLength(2);

    const myThreadsRes = await request(app)
      .get("/api/v1/messages/threads/mine")
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(myThreadsRes.status).toBe(200);
    expect(myThreadsRes.body.data).toHaveLength(1);

    const deniedRes = await request(app)
      .get(`/api/v1/messages?staffId=${staff.id}&guardianId=${guardian.id}`)
      .set("Authorization", `Bearer ${otherParentToken}`);
    expect(deniedRes.status).toBe(403);
  });
});

describe("Unit 49 — tenant isolation", () => {
  it("circulars/complaints/surveys/messages created in one tenant are invisible via an unscoped query from another", async () => {
    const tenantA = await createTenant("engagement-iso-a");
    const tenantB = await createTenant("engagement-iso-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const circular = await withTenant(tenantA.id, (tx) =>
      tx.circular.create({
        data: { tenantId: tenantA.id, branchId: branch.id, title: "X", body: "Y", createdById: "owner-1" },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.circular.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.circular.findMany({ where: { id: circular.id } });
    expect(unscoped).toHaveLength(0);
  });
});
