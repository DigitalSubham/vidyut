import type { Request, Response } from "express";
import type {
  CreateBookCopyInput,
  CreateBookInput,
  CreateBookIssueInput,
  CreateLibraryMemberInput,
  ListBookIssuesQueryInput,
  ListBooksQueryInput,
  ListLibraryMembersQueryInput,
} from "@vidyut/validation";
import { created, ok } from "../../core/envelope";
import * as service from "./service";

export async function createBook(req: Request, res: Response): Promise<void> {
  const book = await service.createBook(req.auth!, req.body as CreateBookInput);
  created(res, book);
}

export async function listBooks(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListBooksQueryInput;
  const books = await service.listBooks(req.auth!, query.branchId);
  ok(res, books);
}

export async function createBookCopy(req: Request, res: Response): Promise<void> {
  const copy = await service.createBookCopy(req.auth!, req.params.id!, req.body as CreateBookCopyInput);
  created(res, copy);
}

export async function listBookCopies(req: Request, res: Response): Promise<void> {
  const copies = await service.listBookCopies(req.auth!, req.params.id!);
  ok(res, copies);
}

export async function createLibraryMember(req: Request, res: Response): Promise<void> {
  const member = await service.createLibraryMember(req.auth!, req.body as CreateLibraryMemberInput);
  created(res, member);
}

export async function listLibraryMembers(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListLibraryMembersQueryInput;
  const members = await service.listLibraryMembers(req.auth!, query.branchId);
  ok(res, members);
}

export async function createBookIssue(req: Request, res: Response): Promise<void> {
  const issue = await service.createBookIssue(req.auth!, req.body as CreateBookIssueInput);
  created(res, issue);
}

export async function listBookIssues(req: Request, res: Response): Promise<void> {
  const query = res.locals.query as ListBookIssuesQueryInput;
  const issues = await service.listBookIssues(req.auth!, query.memberId, query.activeOnly);
  ok(res, issues);
}

export async function renewBookIssue(req: Request, res: Response): Promise<void> {
  const issue = await service.renewBookIssue(req.auth!, req.params.id!);
  ok(res, issue);
}

export async function returnBookIssue(req: Request, res: Response): Promise<void> {
  const issue = await service.returnBookIssue(req.auth!, req.params.id!);
  ok(res, issue);
}
