"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function BooksTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", author: "", isbn: "" });
  const [loadedBookId, setLoadedBookId] = useState("");
  const [barcode, setBarcode] = useState("");

  const booksQuery = useQuery({
    queryKey: ["library-books", branchId],
    queryFn: () => adminApi.listBooks(branchId),
    enabled: !!branchId,
  });
  const copiesQuery = useQuery({
    queryKey: ["library-copies", loadedBookId],
    queryFn: () => adminApi.listBookCopies(loadedBookId),
    enabled: !!loadedBookId,
  });

  const createBookMutation = useMutation({
    mutationFn: () => adminApi.createBook({ branchId, title: form.title, author: form.author, isbn: form.isbn || undefined }),
    onSuccess: () => {
      setForm({ title: "", author: "", isbn: "" });
      void queryClient.invalidateQueries({ queryKey: ["library-books", branchId] });
    },
  });

  const createCopyMutation = useMutation({
    mutationFn: () => adminApi.createBookCopy(loadedBookId, { barcode }),
    onSuccess: () => {
      setBarcode("");
      void queryClient.invalidateQueries({ queryKey: ["library-copies", loadedBookId] });
    },
  });

  const books = booksQuery.data?.data ?? [];
  const copies = copiesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.library.bookTitle") as string}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.library.author") as string}
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
        />
        <Input
          className="max-w-[8rem]"
          placeholder="ISBN"
          value={form.isbn}
          onChange={(e) => setForm({ ...form, isbn: e.target.value })}
        />
        <Button onClick={() => createBookMutation.mutate()} disabled={!form.title || !form.author}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.library.bookTitle")}</TableHead>
            <TableHead>{t("school.library.author")}</TableHead>
            <TableHead>ISBN</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.title}</TableCell>
              <TableCell>{b.author}</TableCell>
              <TableCell>{b.isbn ?? "—"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setLoadedBookId(b.id)}>
                  {t("school.library.viewCopies")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedBookId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.library.copies")}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.library.barcode") as string}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <Button onClick={() => createCopyMutation.mutate()} disabled={!barcode}>
              {t("school.common.save")}
            </Button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {copies.map((c) => (
              <li key={c.id}>
                {c.barcode} — {c.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MembersTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentId: "", staffId: "" });

  const membersQuery = useQuery({
    queryKey: ["library-members", branchId],
    queryFn: () => adminApi.listLibraryMembers(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createLibraryMember({
        branchId,
        studentId: form.studentId || undefined,
        staffId: form.staffId || undefined,
      }),
    onSuccess: () => {
      setForm({ studentId: "", staffId: "" });
      void queryClient.invalidateQueries({ queryKey: ["library-members", branchId] });
    },
  });

  const members = membersQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">{t("school.library.memberHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.library.studentId") as string}
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value, staffId: "" })}
        />
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.library.staffId") as string}
          value={form.staffId}
          onChange={(e) => setForm({ ...form, staffId: e.target.value, studentId: "" })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!form.studentId && !form.staffId}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.library.studentId")}</TableHead>
            <TableHead>{t("school.library.staffId")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.studentId ?? "—"}</TableCell>
              <TableCell>{m.staffId ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function IssuesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ copyId: "", memberId: "" });

  const issuesQuery = useQuery({
    queryKey: ["library-issues", "active"],
    queryFn: () => adminApi.listBookIssues(undefined, true),
  });

  const issueMutation = useMutation({
    mutationFn: () => adminApi.createBookIssue({ copyId: form.copyId, memberId: form.memberId }),
    onSuccess: () => {
      setForm({ copyId: "", memberId: "" });
      void queryClient.invalidateQueries({ queryKey: ["library-issues"] });
      toast.success(t("school.library.issued") as string);
    },
  });

  const renewMutation = useMutation({
    mutationFn: (issueId: string) => adminApi.renewBookIssue(issueId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["library-issues"] }),
  });

  const returnMutation = useMutation({
    mutationFn: (issueId: string) => adminApi.returnBookIssue(issueId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["library-issues"] });
      if (res.data.fineInvoiceId) {
        toast.info(t("school.library.fineGenerated") as string);
      }
    },
  });

  const issues = issuesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.library.copyId") as string}
          value={form.copyId}
          onChange={(e) => setForm({ ...form, copyId: e.target.value })}
        />
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.library.memberId") as string}
          value={form.memberId}
          onChange={(e) => setForm({ ...form, memberId: e.target.value })}
        />
        <Button onClick={() => issueMutation.mutate()} disabled={!form.copyId || !form.memberId}>
          {t("school.library.issue")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.library.copyId")}</TableHead>
            <TableHead>{t("school.library.memberId")}</TableHead>
            <TableHead>{t("school.library.dueAt")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{i.copyId}</TableCell>
              <TableCell>{i.memberId}</TableCell>
              <TableCell>{new Date(i.dueAt).toLocaleDateString()}</TableCell>
              <TableCell className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => renewMutation.mutate(i.id)}>
                  {t("school.library.renew")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(i.id)}>
                  {t("school.library.return")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function LibraryPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.library.title")}</h1>
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">{t("school.library.booksTab")}</TabsTrigger>
          <TabsTrigger value="members">{t("school.library.membersTab")}</TabsTrigger>
          <TabsTrigger value="issues">{t("school.library.issuesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="books">
          <BooksTab />
        </TabsContent>
        <TabsContent value="members">
          <MembersTab />
        </TabsContent>
        <TabsContent value="issues">
          <IssuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
