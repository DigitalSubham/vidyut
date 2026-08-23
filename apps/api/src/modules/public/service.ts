import { prisma, withTenant } from "@vidyut/db";
import type { PublicCreateEnquiryInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { getDownloadUrl } from "../../core/storage";

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

// -- Unit 54: Public Site Depth (notices, gallery, contact) --------------------

/** Newest-first, across all of the tenant's active branches — the public site has no branch picker. */
export async function getPublicNotices(schoolCode: string) {
  const tenant = await resolveTenantBySchoolCode(schoolCode);

  return withTenant(tenant.id, (tx) => tx.publicNotice.findMany({ orderBy: { publishedAt: "desc" }, take: 50 }));
}

/** Only albums a staff member has explicitly flagged `isPublic` — everything else stays staff-only. */
export async function getPublicGallery(schoolCode: string) {
  const tenant = await resolveTenantBySchoolCode(schoolCode);

  const albums = await withTenant(tenant.id, (tx) =>
    tx.galleryAlbum.findMany({
      where: { isPublic: true },
      include: { photos: true },
      orderBy: { createdAt: "desc" },
    })
  );

  return Promise.all(
    albums.map(async (album) => ({
      id: album.id,
      title: album.title,
      photos: await Promise.all(
        album.photos.map(async (p) => ({ id: p.id, caption: p.caption, url: await getDownloadUrl(p.key) }))
      ),
    }))
  );
}

export async function getPublicContact(schoolCode: string) {
  const tenant = await resolveTenantBySchoolCode(schoolCode);

  const branches = await withTenant(tenant.id, (tx) =>
    tx.branch.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } })
  );

  return {
    phone: tenant.contactPhone,
    email: tenant.contactEmail,
    address: tenant.address,
    mapUrl: tenant.mapUrl,
    branches: branches.map((b) => ({ id: b.id, name: b.name, address: b.address })),
  };
}
