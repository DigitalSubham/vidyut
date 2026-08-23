import { withTenant } from "@vidyut/db";
import type { CreatePublicNoticeInput } from "@vidyut/validation";
import type { RequestAuth } from "../../core/guards/types";

/** Unit 54 — staff-facing create/list for the public site's Notices section. */
export async function createNotice(auth: RequestAuth, input: CreatePublicNoticeInput) {
  return withTenant(auth.tenantId, (tx) =>
    tx.publicNotice.create({
      data: { tenantId: auth.tenantId, branchId: input.branchId, title: input.title, body: input.body },
    })
  );
}

export async function listNotices(auth: RequestAuth, branchId: string) {
  return withTenant(auth.tenantId, (tx) =>
    tx.publicNotice.findMany({ where: { branchId }, orderBy: { publishedAt: "desc" } })
  );
}
