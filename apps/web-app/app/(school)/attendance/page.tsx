"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function today() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function RegisterTab() {
  const { t } = useTranslation();
  const [sectionId, setSectionId] = useState("");
  const [loadedSectionId, setLoadedSectionId] = useState("");
  const { month, year } = today();

  const registerQuery = useQuery({
    queryKey: ["attendance-register", loadedSectionId, month, year],
    queryFn: () => adminApi.getRegister(loadedSectionId, month, year),
    enabled: !!loadedSectionId,
  });

  const register = registerQuery.data?.data ?? [];
  const dayColumns = Array.from(new Set(register.flatMap((row) => Object.keys(row.days)))).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder={t("school.attendance.sectionId") as string}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
        />
        <Button onClick={() => setLoadedSectionId(sectionId)}>{t("school.attendance.loadRegister")}</Button>
      </div>

      {registerQuery.isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : register.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.students.name")}</TableHead>
                {dayColumns.map((day) => (
                  <TableHead key={day}>{day}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {register.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    {row.firstName} {row.lastName}
                  </TableCell>
                  {dayColumns.map((day) => (
                    <TableCell key={day}>{row.days[day]?.slice(0, 1) ?? "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

function DefaultersTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const defaultersQuery = useQuery({
    queryKey: ["attendance-defaulters", branchId],
    queryFn: () => adminApi.getDefaulters(branchId),
    enabled: !!branchId,
  });
  const defaulters = defaultersQuery.data?.data ?? [];

  if (defaultersQuery.isLoading) return <p className="text-text-secondary">{t("school.common.loading")}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("school.students.name")}</TableHead>
          <TableHead>%</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {defaulters.map((row) => (
          <TableRow key={row.studentId}>
            <TableCell>
              {row.firstName} {row.lastName}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{row.attendancePercent}%</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AnalyticsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loaded, setLoaded] = useState<{ from: string; to: string } | null>(null);

  const analyticsQuery = useQuery({
    queryKey: ["attendance-analytics", branchId, loaded?.from, loaded?.to],
    queryFn: () => adminApi.getAttendanceAnalytics(branchId, loaded!.from, loaded!.to),
    enabled: !!branchId && !!loaded,
  });

  const trend = analyticsQuery.data?.data.trend ?? [];
  const chronic = analyticsQuery.data?.data.chronicAbsentees ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.attendance.from")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.attendance.to")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={() => setLoaded({ from, to })} disabled={!from || !to}>
          {t("school.common.load")}
        </Button>
      </div>

      {analyticsQuery.isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.attendance.trend")}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("school.attendance.date")}</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trend.map((point) => (
                  <TableRow key={point.date}>
                    <TableCell>{point.date}</TableCell>
                    <TableCell>{point.attendancePercent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold text-text-primary">
              {t("school.attendance.chronicAbsentees")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("school.students.name")}</TableHead>
                  <TableHead>{t("school.attendance.absences")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chronic.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>
                      {row.firstName} {row.lastName}
                    </TableCell>
                    <TableCell>{row.absences}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function DeviceTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [token, setToken] = useState<string | null>(null);

  const rotateMutation = useMutation({
    mutationFn: () => adminApi.rotateAttendanceDeviceToken(branchId),
    onSuccess: (res) => {
      setToken(res.data.deviceToken);
      toast.success(t("school.attendance.deviceTokenRotated") as string);
    },
  });

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-sm text-text-secondary">{t("school.attendance.deviceTokenHelp")}</p>
      <Button onClick={() => rotateMutation.mutate()} disabled={!branchId || rotateMutation.isPending}>
        {t("school.attendance.rotateDeviceToken")}
      </Button>
      {token ? (
        <div className="rounded-lg border border-border bg-bg-elevated p-3">
          <p className="text-xs text-text-secondary">{t("school.attendance.deviceTokenShownOnce")}</p>
          <p className="break-all font-mono text-sm text-text-primary">{token}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function AttendancePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.attendance.title")}</h1>
      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">{t("school.attendance.registerTab")}</TabsTrigger>
          <TabsTrigger value="defaulters">{t("school.attendance.defaulters")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("school.attendance.analyticsTab")}</TabsTrigger>
          <TabsTrigger value="device">{t("school.attendance.deviceTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="register">
          <RegisterTab />
        </TabsContent>
        <TabsContent value="defaulters">
          <DefaultersTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="device">
          <DeviceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
