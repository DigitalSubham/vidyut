import { randomUUID } from "node:crypto";
import { withTenant } from "@vidyut/db";
import type { ListDocumentsQueryInput, RequestDocumentUploadInput } from "@vidyut/validation";
import { AppError } from "../../core/errors";
import { branchAccessAllowed } from "../../core/guards/branch-scope";
import type { RequestAuth } from "../../core/guards/types";
import { getDownloadUrl, getUploadUrl } from "../../core/storage";

function assertBranchAccess(auth: RequestAuth, branchId: string): void {
  if (!branchAccessAllowed(auth, branchId)) {
    throw new AppError("FORBIDDEN", "auth.errors.branchForbidden");
  }
}

async function assertOwnerInBranch(
  auth: RequestAuth,
  branchId: string,
  ownerType: RequestDocumentUploadInput["ownerType"],
  ownerId: string
): Promise<void> {
  const owner =
    ownerType === "STUDENT"
      ? await withTenant(auth.tenantId, (tx) => tx.student.findUnique({ where: { id: ownerId } }))
      : await withTenant(auth.tenantId, (tx) => tx.staff.findUnique({ where: { id: ownerId } }));
  if (!owner || owner.deletedAt || owner.branchId !== branchId) {
    throw new AppError("VALIDATION_ERROR", "document.errors.ownerNotFoundInBranch");
  }
}

export async function requestDocumentUpload(auth: RequestAuth, input: RequestDocumentUploadInput) {
  assertBranchAccess(auth, input.branchId);
  await assertOwnerInBranch(auth, input.branchId, input.ownerType, input.ownerId);

  const key = `documents/${auth.tenantId}/${input.branchId}/${input.ownerType.toLowerCase()}/${input.ownerId}/${randomUUID()}-${input.fileName}`;
  const uploadUrl = await getUploadUrl(key, input.contentType);

  const document = await withTenant(auth.tenantId, (tx) =>
    tx.document.create({
      data: {
        tenantId: auth.tenantId,
        branchId: input.branchId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        key,
        label: input.label,
        tags: input.tags ?? [],
        uploadedById: auth.userId,
      },
    })
  );

  return { document, uploadUrl };
}

export async function listDocuments(auth: RequestAuth, query: ListDocumentsQueryInput) {
  assertBranchAccess(auth, query.branchId);

  const documents = await withTenant(auth.tenantId, (tx) =>
    tx.document.findMany({
      where: {
        branchId: query.branchId,
        ...(query.ownerType ? { ownerType: query.ownerType } : {}),
        ...(query.ownerId ? { ownerId: query.ownerId } : {}),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
  );

  return Promise.all(
    documents.map(async (document) => ({ ...document, downloadUrl: await getDownloadUrl(document.key) }))
  );
}
