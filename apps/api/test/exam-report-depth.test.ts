import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds });
}

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const subject = await withTenant(tenantId, (tx) =>
    tx.subject.create({ data: { tenantId, branchId: branch.id, name: `Subject ${code}`, code: `SUB-${code}` } })
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
  return { branch, cls, subject, section, session };
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
  return signAccessToken({ sub: user.id, tenantId, roles: ["PARENT"], branchIds: [] });
}

describe("Unit 46 — Exams & Report Cards Depth", () => {
  it("exam datesheet, co-scholastic grades, and rank all compute against a real multi-student fixture", async () => {
    const tenant = await createTenant("exam-depth-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage", "marks.enter"]);
    const { branch, cls, subject, session } = await setup(tenant.id, "RD");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const examRes = await request(app)
      .post("/api/v1/exams")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, sessionId: session.id, name: "Half Yearly", type: "HALF_YEARLY", gradingScheme: "MARKS" });
    const examId = examRes.body.data.id;

    const timetableRes = await request(app)
      .post(`/api/v1/exams/${examId}/timetable`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ subjectId: subject.id, date: "2026-08-01", startTime: "10:00", room: "R1" });
    expect(timetableRes.status).toBe(201);

    const timetableListRes = await request(app)
      .get(`/api/v1/exams/${examId}/timetable`)
      .set("Authorization", `Bearer ${owner}`);
    expect(timetableListRes.status).toBe(200);
    expect(timetableListRes.body.data).toHaveLength(1);

    const examSubjectRes = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 });
    const examSubjectId = examSubjectRes.body.data.id;

    const topper = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-TOP",
          firstName: "Topper",
          lastName: "S",
          dob: new Date("2012-01-01"),
          gender: "F",
          address: "Patna",
        },
      })
    );
    const average = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-AVG",
          firstName: "Average",
          lastName: "S",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    await withTenant(tenant.id, (tx) =>
      tx.marksEntry.createMany({
        data: [
          { tenantId: tenant.id, branchId: branch.id, examSubjectId, studentId: topper.id, marks: 95, enteredById: "seed" },
          { tenantId: tenant.id, branchId: branch.id, examSubjectId, studentId: average.id, marks: 60, enteredById: "seed" },
        ],
      })
    );

    const rankRes = await request(app)
      .get(`/api/v1/exams/${examId}/results/rank`)
      .set("Authorization", `Bearer ${owner}`);
    expect(rankRes.status).toBe(200);
    expect(rankRes.body.data[0].studentId).toBe(topper.id);
    expect(rankRes.body.data[0].rank).toBe(1);
    expect(rankRes.body.data[1].studentId).toBe(average.id);
    expect(rankRes.body.data[1].rank).toBe(2);

    const coScholasticRes = await request(app)
      .post(`/api/v1/exams/${examId}/co-scholastic`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ entries: [{ studentId: topper.id, activity: "Discipline", grade: "A" }] });
    expect(coScholasticRes.status).toBe(201);

    // Re-entering the same activity for the same student upserts, doesn't duplicate.
    await request(app)
      .post(`/api/v1/exams/${examId}/co-scholastic`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ entries: [{ studentId: topper.id, activity: "Discipline", grade: "A1" }] });

    const coScholasticListRes = await request(app)
      .get(`/api/v1/exams/${examId}/co-scholastic`)
      .set("Authorization", `Bearer ${owner}`);
    expect(coScholasticListRes.body.data).toHaveLength(1);
    expect(coScholasticListRes.body.data[0].grade).toBe("A1");
  });

  it("GET /students/:id/transcript rolls up only published report cards across sessions", async () => {
    const tenant = await createTenant("transcript-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage", "student.view"]);
    const { branch, session } = await setup(tenant.id, "TR");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const realStudent = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-TRANS",
          firstName: "Trans",
          lastName: "Script",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );

    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          name: "Annual",
          type: "ANNUAL",
          gradingScheme: "MARKS",
        },
      })
    );
    const template = await withTenant(tenant.id, (tx) =>
      tx.reportCardTemplate.create({
        data: { tenantId: tenant.id, name: "Default", board: "CBSE", layout: {} },
      })
    );

    const publishedCard = await withTenant(tenant.id, (tx) =>
      tx.reportCard.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          studentId: realStudent.id,
          examId: exam.id,
          templateId: template.id,
          publishedAt: new Date(),
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          name: "Draft Exam",
          type: "UNIT_TEST",
          gradingScheme: "MARKS",
        },
      })
    ).then((draftExam) =>
      withTenant(tenant.id, (tx) =>
        tx.reportCard.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            sessionId: session.id,
            studentId: realStudent.id,
            examId: draftExam.id,
            templateId: template.id,
            // Not published — must not appear in the transcript.
          },
        })
      )
    );

    const transcriptRes = await request(app)
      .get(`/api/v1/students/${realStudent.id}/transcript`)
      .set("Authorization", `Bearer ${owner}`);
    expect(transcriptRes.status).toBe(200);
    expect(transcriptRes.body.data).toHaveLength(1);
    expect(transcriptRes.body.data[0].id).toBe(publishedCard.id);
  });

  it("MCQ online exam auto-grades correctly on submission, and a question-bank item can be reused into it", async () => {
    const tenant = await createTenant("online-exam-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage"]);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "OE");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "OE1");
    const outsider = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-OUT",
          firstName: "Outsider",
          lastName: "S",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    const parentToken = await linkParentToStudent(tenant.id, student.id, "+919812340099");

    const bankItemRes = await request(app)
      .post("/api/v1/question-bank")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        classId: cls.id,
        subjectId: subject.id,
        questionText: "2 + 2 = ?",
        options: ["3", "4", "5"],
        correctOptionIndex: 1,
      });
    expect(bankItemRes.status).toBe(201);

    const listBankRes = await request(app)
      .get("/api/v1/question-bank")
      .query({ branchId: branch.id, classId: cls.id })
      .set("Authorization", `Bearer ${owner}`);
    expect(listBankRes.body.data).toHaveLength(1);

    const examRes = await request(app)
      .post("/api/v1/online-exams")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, classId: cls.id, subjectId: subject.id, title: "Quick Quiz", durationMinutes: 10 });
    expect(examRes.status).toBe(201);
    const onlineExamId = examRes.body.data.id;

    // Question 1: added directly.
    await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/questions`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ questionText: "1 + 1 = ?", options: ["1", "2", "3"], correctOptionIndex: 1, marks: 2 });

    // Question 2: copied in from the bank.
    const fromBankRes = await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/questions/from-bank`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ questionBankItemId: bankItemRes.body.data.id, marks: 3 });
    expect(fromBankRes.status).toBe(201);
    expect(fromBankRes.body.data.correctOptionIndex).toBe(1);

    // Submitting before publish is rejected.
    const earlySubmit = await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/submit`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: student.id, answers: [1, 1] });
    expect(earlySubmit.status).toBe(400);

    const publishRes = await request(app)
      .patch(`/api/v1/online-exams/${onlineExamId}/publish`)
      .set("Authorization", `Bearer ${owner}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.isPublished).toBe(true);

    const takeRes = await request(app)
      .get(`/api/v1/online-exams/${onlineExamId}/take`)
      .query({ studentId: student.id })
      .set("Authorization", `Bearer ${parentToken}`);
    expect(takeRes.status).toBe(200);
    expect(takeRes.body.data.questions).toHaveLength(2);
    expect(takeRes.body.data.questions[0].correctOptionIndex).toBeUndefined();

    // Self-scoped discovery (the mobile app's own listing, since /online-exams
    // itself needs branch access a PARENT/STUDENT token doesn't carry) shows
    // the published exam as not-yet-submitted.
    const mineBeforeRes = await request(app)
      .get("/api/v1/online-exams/mine")
      .query({ studentId: student.id })
      .set("Authorization", `Bearer ${parentToken}`);
    expect(mineBeforeRes.status).toBe(200);
    expect(mineBeforeRes.body.data).toHaveLength(1);
    expect(mineBeforeRes.body.data[0].submitted).toBe(false);

    // A student not enrolled in this class cannot submit.
    const outsiderParentToken = await linkParentToStudent(tenant.id, outsider.id, "+919812340098");
    const outsiderSubmit = await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/submit`)
      .set("Authorization", `Bearer ${outsiderParentToken}`)
      .send({ studentId: outsider.id, answers: [1, 1] });
    expect(outsiderSubmit.status).toBe(403);

    // Correct answer on Q1 (index 1), wrong on Q2 (correct is 1, submits 0) -> 2/5.
    const submitRes = await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/submit`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: student.id, answers: [1, 0] });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.score).toBe(2);
    expect(submitRes.body.data.maxScore).toBe(5);

    // A second submission is rejected — one shot.
    const resubmit = await request(app)
      .post(`/api/v1/online-exams/${onlineExamId}/submit`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: student.id, answers: [1, 1] });
    expect(resubmit.status).toBe(409);

    // The same self-scoped listing now shows it submitted with the real score.
    const mineAfterRes = await request(app)
      .get("/api/v1/online-exams/mine")
      .query({ studentId: student.id })
      .set("Authorization", `Bearer ${parentToken}`);
    expect(mineAfterRes.body.data[0].submitted).toBe(true);
    expect(mineAfterRes.body.data[0].score).toBe(2);

    const submissionsRes = await request(app)
      .get(`/api/v1/online-exams/${onlineExamId}/submissions`)
      .set("Authorization", `Bearer ${owner}`);
    expect(submissionsRes.status).toBe(200);
    expect(submissionsRes.body.data).toHaveLength(1);
    expect(submissionsRes.body.data[0].score).toBe(2);
  });
});
