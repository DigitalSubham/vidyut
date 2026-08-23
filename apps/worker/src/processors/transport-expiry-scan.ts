import type { Job } from "bullmq";
import { prisma, withTenant, type Vehicle } from "@vidyut/db";
import type { TransportExpiryScanPayload } from "@vidyut/types";
import { enqueue } from "../enqueue";

const DAYS_BEFORE_EXPIRY = 7;

const DOC_FIELDS: { field: keyof Vehicle; docType: "fitness" | "insurance" | "permit" }[] = [
  { field: "fitnessExpiry", docType: "fitness" },
  { field: "insuranceExpiry", docType: "insurance" },
  { field: "permitExpiry", docType: "permit" },
];

/**
 * Unit 57 scope #5 — same nightly-cron-scan shape as Unit 14's
 * `fees-reminder-scan.ts`: no tenantId scans every ACTIVE tenant with the
 * `transport` module enabled; a tenantId scopes to just that tenant.
 */
export async function processTransportExpiryScan(job: Job<TransportExpiryScanPayload>) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);

  const tenantIds = job.data.tenantId
    ? [job.data.tenantId]
    : (await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } })).map((t) => t.id);

  let enqueuedCount = 0;

  for (const tenantId of tenantIds) {
    const moduleToggle = await prisma.moduleToggle.findUnique({
      where: { tenantId_moduleKey: { tenantId, moduleKey: "transport" } },
    });
    if (!moduleToggle?.enabled) {
      continue;
    }

    await withTenant(tenantId, async (tx) => {
      const vehicles = await tx.vehicle.findMany({ where: { deletedAt: null } });

      for (const vehicle of vehicles) {
        for (const { field, docType } of DOC_FIELDS) {
          const expiry = vehicle[field] as Date | null;
          if (!expiry || expiry > cutoff) continue;

          const alreadyAlerted = await tx.notificationLog.findFirst({
            where: {
              templateKey: "transport.docExpiry",
              AND: [
                { payload: { path: ["vehicleId"], equals: vehicle.id } },
                { payload: { path: ["docType"], equals: docType } },
              ],
            },
          });
          // ponytail: a simple "has any prior alert ever fired" check, not a
          // repeat-every-N-days cadence — the upgrade if a school wants
          // repeated reminders as the deadline gets closer.
          if (alreadyAlerted) continue;

          await enqueue("transport.expiryAlert", {
            tenantId,
            branchId: vehicle.branchId,
            vehicleId: vehicle.id,
            regNo: vehicle.regNo,
            docType,
            expiryDate: expiry.toISOString(),
          });
          enqueuedCount += 1;
        }
      }
    });
  }

  return { tenantsScanned: tenantIds.length, alertsEnqueued: enqueuedCount };
}
