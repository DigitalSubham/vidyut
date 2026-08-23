import { randomUUID } from "node:crypto";
import { withTenant } from "@vidyut/db";
import type { CreateGalleryAlbumInput, RequestGalleryPhotoUploadInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getDownloadUrl, getUploadUrl } from "../../core/storage";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

export async function createAlbum(auth: RequestAuth, input: CreateGalleryAlbumInput) {
  assertBranchAccess(auth, input.branchId);

  return withTenant(auth.tenantId, (tx) =>
    tx.galleryAlbum.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, title: input.title, isPublic: input.isPublic },
    })
  );
}

/** Reads are open to any authenticated user — a school gallery is low-sensitivity, same posture as PTM slot timings; RLS still enforces tenant isolation. */
export async function listAlbumsForBranch(auth: RequestAuth, branchId: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.galleryAlbum.findMany({ where: { branchId }, orderBy: { createdAt: "desc" } })
  );
}

async function getAlbumOrThrow(auth: RequestAuth, id: string) {
  const album = await withTenant(auth.tenantId, (tx) => tx.galleryAlbum.findUnique({ where: { id } }));
  if (!album) {
    throw new AppError("NOT_FOUND", "engagement.errors.albumNotFound");
  }
  return album;
}

export async function requestPhotoUpload(auth: RequestAuth, albumId: string, input: RequestGalleryPhotoUploadInput) {
  const album = await getAlbumOrThrow(auth, albumId);
  assertBranchAccess(auth, album.branchId);

  const key = `gallery/${auth.tenantId}/${album.branchId}/${albumId}/${randomUUID()}-${input.fileName}`;
  const uploadUrl = await getUploadUrl(key, input.contentType);

  const photo = await withTenant(auth.tenantId, (tx) =>
    tx.galleryPhoto.create({
      data: { tenantId: auth.tenantId, albumId, key, caption: input.caption },
    })
  );

  return { photo, uploadUrl };
}

export async function listPhotos(auth: RequestAuth, albumId: string) {
  await getAlbumOrThrow(auth, albumId);

  const photos = await withTenant(auth.tenantId, (tx) =>
    tx.galleryPhoto.findMany({ where: { albumId }, orderBy: { uploadedAt: "desc" } })
  );

  return Promise.all(photos.map(async (p) => ({ ...p, url: await getDownloadUrl(p.key) })));
}
