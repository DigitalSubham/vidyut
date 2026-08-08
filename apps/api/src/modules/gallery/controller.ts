import type { Request, Response } from "express";
import type {
  CreateGalleryAlbumInput,
  ListGalleryAlbumsQueryInput,
  RequestGalleryPhotoUploadInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createAlbum(req: Request, res: Response): Promise<void> {
  const album = await service.createAlbum(req.auth!, req.body as CreateGalleryAlbumInput);
  created(res, album);
}

export async function listAlbums(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListGalleryAlbumsQueryInput;
  const albums = await service.listAlbumsForBranch(req.auth!, query.branchId);
  ok(res, albums);
}

export async function requestPhotoUpload(req: Request, res: Response): Promise<void> {
  const result = await service.requestPhotoUpload(
    req.auth!,
    req.params.id!,
    req.body as RequestGalleryPhotoUploadInput
  );
  created(res, result);
}

export async function listPhotos(req: Request, res: Response): Promise<void> {
  const photos = await service.listPhotos(req.auth!, req.params.id!);
  ok(res, photos);
}
