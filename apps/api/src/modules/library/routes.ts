import { Router } from "express";
import {
  createBookCopySchema,
  createBookIssueSchema,
  createBookSchema,
  createLibraryMemberSchema,
  listBookIssuesQuerySchema,
  listBooksQuerySchema,
  listLibraryMembersQuerySchema,
} from "@vidyut/validation";
import { asyncHandler } from "../../core/envelope";
import { authGuard } from "../../core/guards/auth-guard";
import { tenantContext } from "../../core/guards/tenant-context";
import { requirePermission } from "../../core/guards/require-permission";
import { validateBody, validateQuery } from "../../core/guards/validate";
import * as controller from "./controller";

export const libraryRouter = Router();

libraryRouter.use(authGuard, tenantContext, requirePermission("library.manage"));

libraryRouter.post("/books", validateBody(createBookSchema), asyncHandler(controller.createBook));
libraryRouter.get("/books", validateQuery(listBooksQuerySchema), asyncHandler(controller.listBooks));
libraryRouter.post("/books/:id/copies", validateBody(createBookCopySchema), asyncHandler(controller.createBookCopy));
libraryRouter.get("/books/:id/copies", asyncHandler(controller.listBookCopies));

libraryRouter.post("/members", validateBody(createLibraryMemberSchema), asyncHandler(controller.createLibraryMember));
libraryRouter.get("/members", validateQuery(listLibraryMembersQuerySchema), asyncHandler(controller.listLibraryMembers));

libraryRouter.post("/issues", validateBody(createBookIssueSchema), asyncHandler(controller.createBookIssue));
libraryRouter.get("/issues", validateQuery(listBookIssuesQuerySchema), asyncHandler(controller.listBookIssues));
libraryRouter.post("/issues/:id/renew", asyncHandler(controller.renewBookIssue));
libraryRouter.post("/issues/:id/return", asyncHandler(controller.returnBookIssue));
