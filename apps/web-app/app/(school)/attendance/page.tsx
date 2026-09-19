"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function today() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

interface LoadedFilter {
  sectionId: string;
  studentId: string;
  fromDate: string;
  toDate: string;
}

function RegisterTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rangeDays, setRangeDays] = useState(10);
  const [loaded, setLoaded] = useState<LoadedFilter | null>(null);
  const { month, year } = today();

  const classesQuery = useQuery({
    queryKey: ["classes", branchId],
    queryFn: () => adminApi.listClasses(branchId),
    enabled: !!branchId,
  });
  const classes = classesQuery.data?.data ?? [];

  const sectionsQuery = useQuery({
    queryKey: ["sections", classId],
    queryFn: () => adminApi.listSections(classId),
    enabled: !!classId,
  });
  const sections = sectionsQuery.data?.data ?? [];

  const studentsQuery = useQuery({
    queryKey: ["students", branchId, sectionId],
    queryFn: () => adminApi.listStudents(branchId, undefined, sectionId),
    enabled: !!branchId && !!sectionId,
  });
  const students = studentsQuery.data?.data ?? [];

  const registerQuery = useQuery({
    queryKey: ["attendance-register", loaded?.sectionId, month, year],
    queryFn: () => adminApi.getRegister(loaded!.sectionId, month, year),
    enabled: !!loaded && !loaded.studentId,
  });
  const register = registerQuery.data?.data ?? [];
  const dayColumns = Array.from(new Set(register.flatMap((row) => Object.keys(row.days)))).sort(
    (a, b) => Number(a) - Number(b)
  );

  const studentAttendanceQuery = useQuery({
    queryKey: ["attendance-student", loaded?.studentId, loaded?.fromDate, loaded?.toDate],
    queryFn: () =>
      adminApi.listAttendance({
        branchId,
        studentId: loaded!.studentId,
        fromDate: loaded!.fromDate,
        toDate: loaded!.toDate,
        pageSize: 60,
      }),
    enabled: !!loaded && !!loaded.studentId,
  });
  const studentRecords = studentAttendanceQuery.data?.data ?? [];

  function handleLoad() {
    if (!sectionId) return;
    setLoaded(
      studentId
        ? { sectionId, studentId, fromDate: daysAgoIso(rangeDays), toDate: isoDate(new Date()) }
        : { sectionId, studentId: "", fromDate: "", toDate: "" }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.students.class")}</Label>
          <Select
            value={classId}
            onValueChange={(v) => {
              setClassId(v);
              setSectionId("");
              setStudentId("");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("school.common.select") as string} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.students.section")}</Label>
          <Select
            value={sectionId}
            onValueChange={(v) => {
              setSectionId(v);
              setStudentId("");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("school.common.select") as string} />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sectionId ? (
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.attendance.student")}</Label>
            <Select value={studentId || "ALL"} onValueChange={(v) => setStudentId(v === "ALL" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("school.attendance.allStudents")}</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {studentId ? (
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.attendance.range")}</Label>
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t("school.attendance.last10Days")}</SelectItem>
                <SelectItem value="20">{t("school.attendance.last20Days")}</SelectItem>
                <SelectItem value="30">{t("school.attendance.last30Days")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button onClick={handleLoad} disabled={!sectionId}>
          {t("school.attendance.loadRegister")}
        </Button>
      </div>

      {loaded?.studentId ? (
        studentAttendanceQuery.isLoading ? (
          <p className="text-text-secondary">{t("school.common.loading")}</p>
        ) : studentRecords.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.attendance.date")}</TableHead>
                <TableHead>{t("school.students.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-text-secondary">{t("school.attendance.noAttendanceRecords")}</p>
        )
      ) : loaded && !registerQuery.isLoading && register.length > 0 ? (
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
      ) : loaded && registerQuery.isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
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
