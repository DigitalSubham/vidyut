"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function ExpensesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [headName, setHeadName] = useState("");
  const [form, setForm] = useState({ headId: "", amountPaise: "", vendorName: "", date: "", note: "" });

  const headsQuery = useQuery({
    queryKey: ["accounting-expense-heads", branchId],
    queryFn: () => adminApi.listExpenseHeads(branchId),
    enabled: !!branchId,
  });
  const expensesQuery = useQuery({
    queryKey: ["accounting-expenses", branchId],
    queryFn: () => adminApi.listExpenses(branchId),
    enabled: !!branchId,
  });

  const createHeadMutation = useMutation({
    mutationFn: () => adminApi.createExpenseHead({ branchId, name: headName }),
    onSuccess: () => {
      setHeadName("");
      void queryClient.invalidateQueries({ queryKey: ["accounting-expense-heads", branchId] });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: () =>
      adminApi.createExpense({
        branchId,
        headId: form.headId,
        amountPaise: Number(form.amountPaise),
        vendorName: form.vendorName || undefined,
        date: form.date,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      setForm({ headId: "", amountPaise: "", vendorName: "", date: "", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["accounting-expenses", branchId] });
    },
  });

  const heads = headsQuery.data?.data ?? [];
  const expenses = expensesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-xs"
          placeholder={t("school.accounting.headName") as string}
          value={headName}
          onChange={(e) => setHeadName(e.target.value)}
        />
        <Button onClick={() => createHeadMutation.mutate()} disabled={!headName}>
          {t("school.accounting.addHead")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <select
          className="h-9 rounded-md border border-border px-2 text-sm"
          value={form.headId}
          onChange={(e) => setForm({ ...form, headId: e.target.value })}
        >
          <option value="">{t("school.accounting.selectHead")}</option>
          {heads.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.accounting.amountPaise") as string}
          value={form.amountPaise}
          onChange={(e) => setForm({ ...form, amountPaise: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.accounting.vendorName") as string}
          value={form.vendorName}
          onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
        />
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.accounting.note") as string}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <Button onClick={() => createExpenseMutation.mutate()} disabled={!form.headId || !form.amountPaise || !form.date}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.accounting.date")}</TableHead>
            <TableHead>{t("school.accounting.vendorName")}</TableHead>
            <TableHead>{t("school.accounting.amountPaise")}</TableHead>
            <TableHead>{t("school.accounting.note")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
              <TableCell>{e.vendorName ?? "—"}</TableCell>
              <TableCell>{(e.amount / 100).toFixed(2)}</TableCell>
              <TableCell>{e.note ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ExportTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t("school.accounting.exportHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={() => void adminApi.downloadAccountingExport(branchId, from, to)} disabled={!from || !to}>
          {t("school.accounting.downloadCsv")}
        </Button>
      </div>
    </div>
  );
}

export default function AccountingPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.accounting.title")}</h1>
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">{t("school.accounting.expensesTab")}</TabsTrigger>
          <TabsTrigger value="export">{t("school.accounting.exportTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
