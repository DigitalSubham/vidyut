import type { Job } from "bullmq";
import { withTenant } from "@vidyut/db";
import type { ReportCardGeneratePayload } from "@vidyut/types";
import { escapeHtml, pdfShell, renderAndUploadPdf } from "../pdf";

/** Real Puppeteer rendering, closing the stub flagged since Unit 19's Decisions. */
export async function processReportCardGenerate(job: Job<ReportCardGeneratePayload>) {
  const { reportCardId, tenantId } = job.data;

  return withTenant(tenantId, async (tx) => {
    const reportCard = await tx.reportCard.findUnique({
      where: { id: reportCardId },
      include: { branch: true, student: true, exam: true },
    });
    if (!reportCard) {
      return { reportCardId, note: "not_found" };
    }

    const examSubjects = await tx.examSubject.findMany({
      where: { examId: reportCard.examId },
      include: { subject: true },
    });
    const marksEntries = await tx.marksEntry.findMany({
      where: { studentId: reportCard.studentId, examSubjectId: { in: examSubjects.map((es) => es.id) } },
    });
    const coScholastic = await tx.coScholasticGrade.findMany({
      where: { examId: reportCard.examId, studentId: reportCard.studentId },
    });

    const marksRows = examSubjects
      .map((es) => {
        const entry = marksEntries.find((m) => m.examSubjectId === es.id);
        const scored = entry?.isAbsent ? "Absent" : (entry?.marks ?? "—");
        const grade = entry?.grade ?? "—";
        return `<tr><td>${escapeHtml(es.subject.name)}</td><td>${es.maxMarks}</td><td>${scored}</td><td>${escapeHtml(grade)}</td></tr>`;
      })
      .join("");

    const coScholasticRows = coScholastic
      .map((c) => `<tr><td>${escapeHtml(c.activity)}</td><td>${escapeHtml(c.grade)}</td></tr>`)
      .join("");

    const bodyHtml = `
      <div class="meta">
        <span><strong>Student:</strong> ${escapeHtml(reportCard.student.firstName)} ${escapeHtml(reportCard.student.lastName)}</span>
        <span><strong>Admission No:</strong> ${escapeHtml(reportCard.student.admissionNo)}</span>
      </div>
      <div class="meta">
        <span><strong>Exam:</strong> ${escapeHtml(reportCard.exam.name)}</span>
      </div>
      <table><thead><tr><th>Subject</th><th>Max Marks</th><th>Scored</th><th>Grade</th></tr></thead><tbody>${marksRows}</tbody></table>
      ${
        coScholasticRows
          ? `<p style="margin-top:20px; font-weight:600; font-size:13px;">Co-Scholastic</p><table><thead><tr><th>Activity</th><th>Grade</th></tr></thead><tbody>${coScholasticRows}</tbody></table>`
          : ""
      }
    `;

    const html = pdfShell({
      branchName: reportCard.branch.name,
      logoUrl: reportCard.branch.logoUrl,
      title: "Report Card",
      bodyHtml,
    });
    const key = `reportcards/${tenantId}/${reportCard.branchId}/${reportCardId}.pdf`;
    await renderAndUploadPdf(key, html);

    await tx.reportCard.update({ where: { id: reportCardId }, data: { pdfUrl: key } });

    return { reportCardId, note: "rendered" };
  });
}
