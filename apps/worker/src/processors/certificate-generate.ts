import type { Job } from "bullmq";
import QRCode from "qrcode";
import { withTenant } from "@vidyut/db";
import type { CertificateGeneratePayload } from "@vidyut/types";
import { escapeHtml, pdfShell, renderAndUploadPdf } from "../pdf";

/** Duplicated from apps/api/src/modules/certificates/service.ts — small, pure, cross-app-boundary reuse convention (matches `enqueue`, `providers/*`). */
function renderCertificateTemplate(body: string, data: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => data[token] ?? "");
}

const DEFAULT_BODIES: Record<string, string> = {
  TC: "This is to certify that {{studentName}} (Admission No: {{admissionNo}}), a student of Class {{className}}, has been issued a Transfer Certificate on {{issueDate}}.",
  BONAFIDE: "This is to certify that {{studentName}} (Admission No: {{admissionNo}}) is a bonafide student of Class {{className}} in this institution.",
  CHARACTER: "This is to certify that {{studentName}} (Admission No: {{admissionNo}}) bears a good moral character to the best of our knowledge.",
  CONDUCT: "This is to certify that {{studentName}} (Admission No: {{admissionNo}}) has maintained satisfactory conduct during their time at this institution.",
  ID_CARD: "{{studentName}}\nClass {{className}}\nAdmission No: {{admissionNo}}",
  ADMIT_CARD: "{{studentName}}\nAdmission No: {{admissionNo}}\nAdmit card for the current examination.",
  CUSTOM: "{{studentName}}",
};

/** Real Puppeteer rendering, closing the stub flagged since Unit 21's Decisions. Renders a real QR image for ID/admit cards (Unit 50's own open question). */
export async function processCertificateGenerate(job: Job<CertificateGeneratePayload>) {
  const { certificateId, tenantId, qrData } = job.data;

  return withTenant(tenantId, async (tx) => {
    const certificate = await tx.certificate.findUnique({
      where: { id: certificateId },
      include: { branch: true, student: true, staff: { include: { user: true } }, template: true },
    });
    if (!certificate) {
      return { certificateId, note: "not_found" };
    }

    let className = "";
    let admissionNo = "";
    let studentName = "";
    if (certificate.student) {
      studentName = `${certificate.student.firstName} ${certificate.student.lastName}`;
      admissionNo = certificate.student.admissionNo;
      const enrollment = await tx.enrollment.findFirst({
        where: { studentId: certificate.student.id, status: "ACTIVE" },
        include: { class: true, section: true },
        orderBy: { createdAt: "desc" },
      });
      className = enrollment ? `${enrollment.class.name} - ${enrollment.section.name}` : "";
    }

    const tokens: Record<string, string> = {
      studentName,
      admissionNo,
      className,
      issueDate: certificate.issuedAt.toLocaleDateString("en-IN"),
      staffName: certificate.staff?.user?.name ?? "",
      designation: certificate.staff?.designation ?? "",
      employeeNo: certificate.staff?.employeeNo ?? "",
      certificateNo: certificate.number,
    };

    const templateBody = certificate.template?.body ?? DEFAULT_BODIES[certificate.type] ?? "{{studentName}}";
    const rendered = renderCertificateTemplate(templateBody, tokens);

    let qrImg = "";
    if (qrData) {
      const dataUri = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
      qrImg = `<img src="${dataUri}" style="width:100px; height:100px; margin-top:16px;" />`;
    }

    const bodyHtml = `
      <p style="white-space: pre-line; font-size: 13px; line-height: 1.6;">${escapeHtml(rendered)}</p>
      <p class="meta" style="margin-top: 16px;">Certificate No: ${escapeHtml(certificate.number)}</p>
      ${qrImg}
    `;

    const html = pdfShell({
      branchName: certificate.branch.name,
      logoUrl: certificate.branch.logoUrl,
      title: certificate.customTitle ?? certificate.type.replace(/_/g, " "),
      bodyHtml,
    });
    const key = `certificates/${tenantId}/${certificate.branchId}/${certificateId}.pdf`;
    await renderAndUploadPdf(key, html);

    await tx.certificate.update({ where: { id: certificateId }, data: { pdfUrl: key } });

    return { certificateId, note: "rendered" };
  });
}
