import type { Job } from "bullmq";
import * as XLSX from "xlsx";
import { getCurrentSessionId, nextAdmissionNo, withTenant } from "@vidyut/db";
import { importStudentRowSchema } from "@vidyut/validation";
import type {
  StudentsImportPayload,
  StudentsImportResult,
  StudentsImportRowResult,
} from "@vidyut/types";
import { getObjectBuffer } from "../storage";

/**
 * Parses an .xlsx/.csv sheet of students, resolves each row's class/section
 * by name (staff filling in a spreadsheet don't know internal IDs — context/
 * feature-specs/07's Decisions), and creates Student+Enrollment per valid
 * row. Each row runs in its own withTenant() transaction so one bad row
 * doesn't abort the rest of the file.
 */
export async function processStudentsImport(
  job: Job<StudentsImportPayload>
): Promise<StudentsImportResult> {
  const { tenantId, branchId, fileKey } = job.data;

  const buffer = await getObjectBuffer(fileKey);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Import file has no sheets");
  }
  const sheet = workbook.Sheets[firstSheetName]!;
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const currentSessionId = await withTenant(tenantId, (tx) => getCurrentSessionId(tx, branchId));
  if (!currentSessionId) {
    throw new Error("Branch has no current academic session — set one before importing students");
  }

  const rows: StudentsImportRowResult[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const parsed = importStudentRowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      rows.push({
        row: rowNumber,
        status: "error",
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      continue;
    }

    try {
      const student = await withTenant(tenantId, async (tx) => {
        const cls = await tx.class.findFirst({
          where: { branchId, name: parsed.data.className, deletedAt: null },
        });
        if (!cls) {
          throw new Error(`student.errors.classNotFound:${parsed.data.className}`);
        }
        const section = await tx.section.findFirst({
          where: { classId: cls.id, name: parsed.data.sectionName, deletedAt: null },
        });
        if (!section) {
          throw new Error(`student.errors.sectionNotFound:${parsed.data.sectionName}`);
        }

        const admissionNo = parsed.data.admissionNo ?? (await nextAdmissionNo(tx, branchId));

        const created = await tx.student.create({
          data: {
            tenantId,
            branchId,
            admissionNo,
            rollNo: parsed.data.rollNo,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            dob: parsed.data.dob,
            gender: parsed.data.gender,
            bloodGroup: parsed.data.bloodGroup,
            category: parsed.data.category,
            religion: parsed.data.religion,
            address: parsed.data.address,
          },
        });

        await tx.enrollment.create({
          data: {
            tenantId,
            branchId,
            studentId: created.id,
            sessionId: currentSessionId,
            classId: cls.id,
            sectionId: section.id,
            rollNo: parsed.data.rollNo,
          },
        });

        return created;
      });

      rows.push({ row: rowNumber, status: "success", studentId: student.id });
    } catch (error) {
      rows.push({
        row: rowNumber,
        status: "error",
        error: error instanceof Error ? error.message : "student.errors.importRowFailed",
      });
    }
  }

  return {
    total: rows.length,
    succeeded: rows.filter((r) => r.status === "success").length,
    failed: rows.filter((r) => r.status === "error").length,
    rows,
  };
}
