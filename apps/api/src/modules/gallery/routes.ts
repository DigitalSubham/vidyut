import { Router } from "express";
import {
  createGalleryAlbumSchema,
  listGalleryAlbumsQuerySchema,
  requestGalleryPhotoUploadSchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requireBranch } from "../../core/guards/branch-scope";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const galleryRouter = Router();

galleryRouter.use(authGuard, tenantContext);

const branchIdFromBody = (req: { body?: { branchId?: unknown } }) =>
  typeof req.body?.branchId === "string" ? req.body.branchId : undefined;

galleryRouter.post(
  "/albums",
  requireBranch(branchIdFromBody),
  requirePermission("engagement.manage"),
  validateBody(createGalleryAlbumSchema),
  asyncHandler(controller.createAlbum)
);

galleryRouter.get("/albums", validateQuery(listGalleryAlbumsQuerySchema), asyncHandler(controller.listAlbums));

galleryRouter.post(
  "/albums/:id/photos",
  requirePermission("engagement.manage"),
  validateBody(requestGalleryPhotoUploadSchema),
  asyncHandler(controller.requestPhotoUpload)
);

galleryRouter.get("/albums/:id/photos", asyncHandler(controller.listPhotos));
