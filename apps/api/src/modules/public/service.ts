import { prisma, withTenant } from "@vidyut/db";
import type { PublicCreateEnquiryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";

/**
 * Unit 29 — the public school-site's tenant resolution + admission intake.
 * No auth (a prospective parent has no account yet); this module never
 * trusts a client-supplied tenantId/branchId, only ever a `schoolCode`.
 */
async function resolveTenantBySchoolCode(schoolCode: string) {
  const tenant = await prisma.tenant.findUnique({ where: { schoolCode: schoolCode.toUpperCase() } });
  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    throw new AppError("NOT_FOUND", "tenant.errors.schoolCodeNotFound");
  }
  return tenant;
}

export async function getPublicSchoolInfo(schoolCode: string) {
  const tenant = await resolveTenantBySchoolCode(schoolCode);

  const branches = await withTenant(tenant.id, (tx) =>
    tx.branch.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
  );

  return {
    name: tenant.name,
    schoolCode: tenant.schoolCode,
    branches: branches.map((b) => ({ id: b.id, name: b.name, board: b.board, address: b.address, logoUrl: b.logoUrl })),
  };
}

/**
 * Creates an `Enquiry` directly (not an `Application` — staff still convert
 * enquiry -> application through Unit 10's existing staff-facing flow, this
 * is just the public intake). Defaults to the tenant's oldest active branch
 * since a public form only knows a schoolCode, not a branchId; multi-branch
 * schools needing a real branch picker is deferred, not built here.
 */
export async function submitPublicEnquiry(schoolCode: string, input: PublicCreateEnquiryInput) {
  const tenant = await resolveTenantBySchoolCode(schoolCode);

  return withTenant(tenant.id, async (tx) => {
    const branch = await tx.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    if (!branch) {
      throw new AppError("VALIDATION_ERROR", "admission.errors.noActiveBranch");
    }

    return tx.enquiry.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        childName: input.childName,
        guardianName: input.guardianName,
        phone: input.phone,
        source: input.source,
      },
    });
  });
}
