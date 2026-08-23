"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId, type ReportType } from "@/lib/admin-client";

const REPORT_TYPES: ReportType[] = ["attendance", "fees", "exams", "admissions", "staff"];

function defaultFrom(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

function StandardReportTab({ reportType }: { reportType: ReportType }) {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["report", reportType, branchId, from, to],
    queryFn: () => adminApi.getReport(reportType, branchId, from, to),
    enabled: !!branchId,
  });

  const rows = data?.data ?? [];
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.reports.from")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.reports.to")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          {t("school.common.load")}
        </Button>
        <Button variant="outline" onClick={() => void adminApi.downloadReportCsv(reportType, branchId, from, to)}>
          {t("school.reports.downloadCsv")}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-text-secondary">{t("school.reports.noData")}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {headers.map((h) => (
                    <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function KpiSummaryTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-summary", branchId],
    queryFn: () => adminApi.getKpiSummary(branchId),
    enabled: !!branchId,
  });
  const summary = data?.data;

  if (isLoading || !summary) {
    return <p className="text-text-secondary">{t("school.common.loading")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-text-secondary">{t("school.reports.attendance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.attendance.averagePercent ?? "—"}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-text-secondary">{t("school.reports.fees")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.fees.collectionPercent}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-text-secondary">{t("school.reports.exams")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.exams.examCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-text-secondary">{t("school.reports.admissions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {summary.admissions.enquiries} / {summary.admissions.applications}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-text-secondary">{t("school.reports.staff")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.staff.headcount}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [form, setForm] = useState<{ reportType: ReportType; cadence: "WEEKLY" | "MONTHLY"; recipientEmail: string }>({
    reportType: "attendance",
    cadence: "WEEKLY",
    recipientEmail: "",
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.scheduleReport({ branchId, ...form }),
    onSuccess: () => toast.success(t("school.reports.scheduled") as string),
  });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-sm text-text-secondary">{t("school.reports.scheduleHint")}</p>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.reports.reportType")}</Label>
        <Select value={form.reportType} onValueChange={(v) => setForm({ ...form, reportType: v as ReportType })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`school.reports.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.reports.cadence")}</Label>
        <Select value={form.cadence} onValueChange={(v) => setForm({ ...form, cadence: v as "WEEKLY" | "MONTHLY" })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEEKLY">{t("school.reports.weekly")}</SelectItem>
            <SelectItem value="MONTHLY">{t("school.reports.monthly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.reports.recipientEmail")}</Label>
        <Input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
      </div>
      <Button
        className="w-fit"
        onClick={() => mutation.mutate()}
        disabled={!branchId || !form.recipientEmail || mutation.isPending}
      >
        {t("school.reports.schedule")}
      </Button>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.reports.title")}</h1>
      <Tabs defaultValue="kpi">
        <TabsList>
          <TabsTrigger value="kpi">{t("school.reports.kpiSummary")}</TabsTrigger>
          {REPORT_TYPES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {t(`school.reports.${r}`)}
            </TabsTrigger>
          ))}
          <TabsTrigger value="schedule">{t("school.reports.schedule")}</TabsTrigger>
        </TabsList>
        <TabsContent value="kpi">
          <KpiSummaryTab />
        </TabsContent>
        {REPORT_TYPES.map((r) => (
          <TabsContent key={r} value={r}>
            <StandardReportTab reportType={r} />
          </TabsContent>
        ))}
        <TabsContent value="schedule">
          <ScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
