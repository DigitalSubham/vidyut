"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function StaffListTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const { data, isLoading } = useQuery({
    queryKey: ["staff", branchId],
    queryFn: () => adminApi.listStaff(branchId),
    enabled: !!branchId,
  });
  const staff = data?.data ?? [];

  if (isLoading) return <p className="text-text-secondary">{t("school.common.loading")}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("school.staff.employeeNo")}</TableHead>
          <TableHead>{t("school.staff.designation")}</TableHead>
          <TableHead>{t("school.staff.type")}</TableHead>
          <TableHead>{t("school.staff.docsCount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-mono text-xs">{s.id}</TableCell>
            <TableCell>{s.employeeNo}</TableCell>
            <TableCell>{s.designation}</TableCell>
            <TableCell>{s.docs?.length ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DocumentsTab() {
  const { t } = useTranslation();
  const [staffId, setStaffId] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no file");
      const { data } = await adminApi.requestStaffDocumentUpload(staffId, {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        label,
      });
      await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      return data;
    },
    onSuccess: () => {
      toast.success(t("school.staff.documentUploaded") as string);
      setFile(null);
      setLabel("");
    },
  });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.staff.staffId")}</Label>
        <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="stf_..." />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.staff.documentLabel")}</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Aadhaar card" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.staff.chooseFile")}</Label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-text-secondary"
        />
      </div>
      <Button
        onClick={() => uploadMutation.mutate()}
        disabled={!staffId || !label || !file || uploadMutation.isPending}
      >
        {t("school.staff.upload")}
      </Button>
    </div>
  );
}

function AttendanceTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Array<{ staffId: string; status: string }>>([{ staffId: "", status: "PRESENT" }]);
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["staff-attendance", branchId, date],
    queryFn: () => adminApi.listStaffAttendance(branchId, date),
    enabled: !!branchId,
  });

  const markMutation = useMutation({
    mutationFn: () =>
      adminApi.markStaffAttendance({
        branchId,
        date,
        source: "WEB",
        records: rows.filter((r) => r.staffId),
      }),
    onSuccess: () => {
      toast.success(t("school.staff.attendanceSaved") as string);
      void queryClient.invalidateQueries({ queryKey: ["staff-attendance", branchId, date] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Label>{t("school.staff.date")}</Label>
        <Input type="date" className="max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder={t("school.staff.staffId") as string}
            value={row.staffId}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i]!, staffId: e.target.value };
              setRows(next);
            }}
          />
          <Select
            value={row.status}
            onValueChange={(v) => {
              const next = [...rows];
              next[i] = { ...next[i]!, status: v };
              setRows(next);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setRows([...rows, { staffId: "", status: "PRESENT" }])}>
          {t("school.staff.addRow")}
        </Button>
        <Button onClick={() => markMutation.mutate()} disabled={markMutation.isPending}>
          {t("school.common.save")}
        </Button>
      </div>

      {listQuery.data?.data && listQuery.data.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.staff.staffId")}</TableHead>
              <TableHead>{t("school.staff.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.staffId}</TableCell>
                <TableCell>
                  <Badge>{r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

function IdCardTab() {
  const { t } = useTranslation();
  const [staffId, setStaffId] = useState("");
  const [result, setResult] = useState<{ id: string; number: string } | null>(null);

  const issueMutation = useMutation({
    mutationFn: () => adminApi.issueCertificate({ staffId, type: "ID_CARD" }),
    onSuccess: (res) => {
      setResult(res.data);
      toast.success(t("school.staff.idCardIssued") as string);
    },
  });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("school.staff.staffId")}</Label>
        <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="stf_..." />
      </div>
      <Button onClick={() => issueMutation.mutate()} disabled={!staffId || issueMutation.isPending}>
        {t("school.staff.issueIdCard")}
      </Button>
      {result ? (
        <p className="text-sm text-text-secondary">
          {t("school.staff.certificateNumber")}: <span className="font-mono">{result.number}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function StaffPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.staff.title")}</h1>
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{t("school.staff.listTab")}</TabsTrigger>
          <TabsTrigger value="documents">{t("school.staff.documentsTab")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("school.staff.attendanceTab")}</TabsTrigger>
          <TabsTrigger value="idcard">{t("school.staff.idCardTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <StaffListTab />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
        <TabsContent value="idcard">
          <IdCardTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
