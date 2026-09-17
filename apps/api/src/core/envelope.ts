import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { Prisma } from "@vidyut/db";
import { AppError } from "./errors";
import { captureError } from "./sentry";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Success envelope, single resource — context/api-conventions.md. */
export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ data });
}

/** 201 Created — same shape as ok(), different status. */
export function created(res: Response, data: unknown): void {
  ok(res, data, 201);
}

/** Success envelope, list — adds pagination meta. */
export function list(res: Response, data: unknown[], meta: { page: number; pageSize: number; total: number }): void {
  const paginationMeta: PaginationMeta = {
    ...meta,
    totalPages: Math.max(1, Math.ceil(meta.total / meta.pageSize)),
  };
  res.status(200).json({ data, meta: paginationMeta });
}

/** 204 No Content — deletes/no-op mutations. */
export function noContent(res: Response): void {
  res.status(204).end();
}

/** Wraps an async Express handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
    return;
  }

  // A unique-constraint violation (duplicate class name, subject code,
  // admission no., etc. — any @@unique in packages/db/prisma/schema) is a
  // normal, expected user mistake, not a server fault. No individual
  // service module in this codebase catches Prisma's P2002 (confirmed —
  // zero call sites), so every one of them previously fell through to this
  // handler's generic 500 below. Handled once, globally, here: covers every
  // unique constraint across every module, not just whichever ones a given
  // change happens to touch.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]) : [];
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: "platform.errors.duplicateValue",
        ...(target.length > 0 ? { fields: Object.fromEntries(target.map((f) => [f, "platform.errors.alreadyExists"])) } : {}),
      },
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  captureError(err, { requestId: req.requestId, tenantId: req.auth?.tenantId });
  res.status(500).json({
    error: { code: "INTERNAL", message: "auth.errors.internal" },
  });
};
