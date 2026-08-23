"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

export default function NewslettersPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "" });

  const newslettersQuery = useQuery({
    queryKey: ["newsletters", branchId],
    queryFn: () => adminApi.listNewsletters(branchId),
    enabled: !!branchId,
  });

  const sendMutation = useMutation({
    mutationFn: () => adminApi.createNewsletter({ branchId, title: form.title, body: form.body }),
    onSuccess: () => {
      setForm({ title: "", body: "" });
      void queryClient.invalidateQueries({ queryKey: ["newsletters", branchId] });
    },
  });

  const newsletters = newslettersQuery.data?.data ?? [];

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.newsletters.title")}</h1>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <Input
          placeholder={t("school.newsletters.newsletterTitle") as string}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="min-h-24 rounded-md border border-border bg-transparent p-2 text-sm"
          placeholder={t("school.newsletters.body") as string}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <Button
          className="self-start"
          onClick={() => sendMutation.mutate()}
          disabled={!form.title || !form.body}
        >
          {t("school.newsletters.send")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.newsletters.newsletterTitle")}</TableHead>
            <TableHead>{t("school.newsletters.sentAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {newsletters.map((n) => (
            <TableRow key={n.id}>
              <TableCell>{n.title}</TableCell>
              <TableCell>{n.sentAt ? new Date(n.sentAt).toLocaleString() : t("school.newsletters.notSent")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
