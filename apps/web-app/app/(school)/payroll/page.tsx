"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function SalaryStructuresTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ staffId: "", basicPaise: "", hraPaise: "" });

  const structuresQuery = useQuery({
    queryKey: ["payroll-structures", branchId],
    queryFn: () => adminApi.listSalaryStructures(branchId),
    enabled: !!branchId,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.upsertSalaryStructure({
        branchId,
        staffId: form.staffId,
        basicPaise: Number(form.basicPaise),
        hraPaise: Number(form.hraPaise),
      }),
    onSuccess: () => {
      setForm({ staffId: "", basicPaise: "", hraPaise: "" });
      void queryClient.invalidateQueries({ queryKey: ["payroll-structures", branchId] });
    },
  });

  const structures = structuresQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.payroll.staffId") as string}
          value={form.staffId}
          onChange={(e) => setForm({ ...form, staffId: e.target.value })}
        />
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.payroll.basicPaise") as string}
          value={form.basicPaise}
          onChange={(e) => setForm({ ...form, basicPaise: e.target.value })}
        />
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.payroll.hraPaise") as string}
          value={form.hraPaise}
          onChange={(e) => setForm({ ...form, hraPaise: e.target.value })}
        />
        <Button onClick={() => saveMutation.mutate()} disabled={!form.staffId || !form.basicPaise}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.payroll.staffId")}</TableHead>
            <TableHead>{t("school.payroll.basicPaise")}</TableHead>
            <TableHead>{t("school.payroll.hraPaise")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {structures.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.staffId}</TableCell>
              <TableCell>{(s.basic / 100).toFixed(2)}</TableCell>
              <TableCell>{(s.hra / 100).toFixed(2)}</TableCell>
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
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{t("school.payroll.exportHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input className="max-w-[6rem]" type="number" placeholder="MM" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Input className="max-w-[8rem]" type="number" placeholder="YYYY" value={year} onChange={(e) => setYear(e.target.value)} />
        <Button onClick={() => void adminApi.downloadPayrollExport(branchId, month, year)} disabled={!month || !year}>
          {t("school.payroll.downloadCsv")}
        </Button>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.payroll.title")}</h1>
      <Tabs defaultValue="structures">
        <TabsList>
          <TabsTrigger value="structures">{t("school.payroll.structuresTab")}</TabsTrigger>
          <TabsTrigger value="export">{t("school.payroll.exportTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="structures">
          <SalaryStructuresTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
