import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../errors";

/** Zod-validates req.body, replacing it with the parsed (typed) value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        fields[key] = issue.message;
      }
      next(new AppError("VALIDATION_ERROR", "auth.errors.validation", fields));
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Zod-validates req.query. */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        fields[key] = issue.message;
      }
      next(new AppError("VALIDATION_ERROR", "auth.errors.validation", fields));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
