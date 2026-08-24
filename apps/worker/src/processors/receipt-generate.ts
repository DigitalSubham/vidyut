import type { Job } from "bullmq";
import { withTenant } from "@vidyut/db";
import type { ReceiptGeneratePayload } from "@vidyut/types";
import { escapeHtml, pdfShell, renderAndUploadPdf } from "../pdf";

/** Real Puppeteer rendering, closing the stub flagged since Unit 12's Decisions. */
export async function processReceiptGenerate(job: Job<ReceiptGeneratePayload>) {
  const { receiptId, tenantId } = job.data;

  return withTenant(tenantId, async (tx) => {
    const receipt = await tx.receipt.findUnique({
      where: { id: receiptId },
      include: {
        branch: true,
        payment: {
          include: {
            student: true,
            invoice: { include: { items: { include: { feeHead: true } } } },
          },
        },
      },
    });
    if (!receipt) {
      return { receiptId, note: "not_found" };
    }

    const { payment, branch } = receipt;
    const rows = payment.invoice
      ? payment.invoice.items
          .map(
            (item) =>
              `<tr><td>${escapeHtml(item.feeHead.name)}</td><td>₹${((item.amount - item.discount + item.fine) / 100).toFixed(2)}</td></tr>`
          )
          .join("")
      : "";

    const bodyHtml = `
      <div class="meta">
        <span><strong>Receipt No:</strong> ${escapeHtml(receipt.number)}</span>
        <span><strong>Date:</strong> ${receipt.createdAt.toLocaleDateString("en-IN")}</span>
      </div>
      <div class="meta">
        <span><strong>Student:</strong> ${escapeHtml(payment.student.firstName)} ${escapeHtml(payment.student.lastName)}</span>
        <span><strong>Admission No:</strong> ${escapeHtml(payment.student.admissionNo)}</span>
      </div>
      ${
        rows
          ? `<table><thead><tr><th>Fee Head</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>`
          : ""
      }
      <p style="margin-top: 16px; font-size: 14px;"><strong>Amount paid: ₹${(payment.amount / 100).toFixed(2)}</strong> via ${payment.mode}</p>
    `;

    const html = pdfShell({ branchName: branch.name, logoUrl: branch.logoUrl, title: "Fee Receipt", bodyHtml });
    const key = `receipts/${tenantId}/${branch.id}/${receiptId}.pdf`;
    await renderAndUploadPdf(key, html);

    await tx.receipt.update({ where: { id: receiptId }, data: { pdfUrl: key } });

    return { receiptId, note: "rendered" };
  });
}
