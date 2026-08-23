"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const STAGES = ["NEW", "CONTACTED", "VISITED", "APPLIED", "ADMITTED", "LOST"];
const APPLICATION_STATUSES = ["DRAFT", "SUBMITTED", "OFFERED", "CONFIRMED", "REJECTED"];

function EnquiriesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [childName, setChildName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");

  const enquiriesQuery = useQuery({
    queryKey: ["enquiries", branchId, stageFilter],
    queryFn: () => adminApi.listEnquiries(branchId, stageFilter || undefined),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createEnquiry({ branchId, childName, guardianName, phone, source }),
    onSuccess: () => {
      setChildName("");
      setGuardianName("");
      setPhone("");
      setSource("");
      toast.success(t("school.admissions.enquiryCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["enquiries", branchId] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => adminApi.patchEnquiryStage(id, stage),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["enquiries", branchId] }),
  });

  const enquiries = enquiriesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.admissions.newEnquiry")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.childName")}</Label>
            <Input className="max-w-xs" value={childName} onChange={(e) => setChildName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.guardianName")}</Label>
            <Input className="max-w-xs" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.phone")}</Label>
            <Input className="max-w-xs" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.source")}</Label>
            <Input className="max-w-xs" placeholder="Walk-in / Website / Referral" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!childName || !guardianName || !phone || !source}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.admissions.stage")}</Label>
          <Select value={stageFilter || "ALL"} onValueChange={(v) => setStageFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("school.admissions.allStages")}</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.admissions.childName")}</TableHead>
            <TableHead>{t("school.admissions.guardianName")}</TableHead>
            <TableHead>{t("school.guardians.phone")}</TableHead>
            <TableHead>{t("school.admissions.stage")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enquiries.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.childName}</TableCell>
              <TableCell>{e.guardianName}</TableCell>
              <TableCell>{e.phone}</TableCell>
              <TableCell>
                <Select value={e.stage} onValueChange={(stage) => stageMutation.mutate({ id: e.id, stage })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ApplicationsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [classAppliedId, setClassAppliedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [convertingId, setConvertingId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const applicationsQuery = useQuery({
    queryKey: ["applications", branchId, statusFilter],
    queryFn: () => adminApi.listApplications(branchId, statusFilter || undefined),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createApplication({
        branchId,
        classAppliedId,
        formData: { childName, dob, guardianName, guardianPhone },
      }),
    onSuccess: () => {
      setChildName("");
      setDob("");
      setGuardianName("");
      setGuardianPhone("");
      setClassAppliedId("");
      toast.success(t("school.admissions.applicationCreated") as string);
      void queryClient.invalidateQueries({ queryKey: ["applications", branchId] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => adminApi.convertApplication(convertingId, sectionId),
    onSuccess: () => {
      setConvertingId("");
      setSectionId("");
      toast.success(t("school.admissions.converted") as string);
      void queryClient.invalidateQueries({ queryKey: ["applications", branchId] });
    },
  });

  const applications = applicationsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.admissions.newApplication")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.childName")}</Label>
            <Input className="max-w-xs" value={childName} onChange={(e) => setChildName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.dob")}</Label>
            <Input type="date" className="max-w-xs" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.guardianName")}</Label>
            <Input className="max-w-xs" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.guardianPhone")}</Label>
            <Input className="max-w-xs" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.classAppliedId")}</Label>
            <Input className="max-w-xs" value={classAppliedId} onChange={(e) => setClassAppliedId(e.target.value)} />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!childName || !dob || !guardianName || !guardianPhone || !classAppliedId}
          >
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.admissions.status")}</Label>
          <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("school.admissions.allStatuses")}</SelectItem>
              {APPLICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.admissions.childName")}</TableHead>
            <TableHead>{t("school.admissions.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.formData.childName}</TableCell>
              <TableCell>
                <Badge variant="outline">{a.status}</Badge>
              </TableCell>
              <TableCell>
                {a.status !== "CONFIRMED" ? (
                  <Button variant="outline" size="sm" onClick={() => setConvertingId(a.id)}>
                    {t("school.admissions.convert")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {convertingId ? (
        <div className="flex items-end gap-2 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.admissions.sectionId")}</Label>
            <Input className="max-w-xs" value={sectionId} onChange={(e) => setSectionId(e.target.value)} />
          </div>
          <Button onClick={() => convertMutation.mutate()} disabled={!sectionId}>
            {t("school.admissions.confirmConvert")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdmissionsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-xl font-semibold text-text-primary">{t("school.admissions.title")}</h1>
      <Tabs defaultValue="enquiries">
        <TabsList>
          <TabsTrigger value="enquiries">{t("school.admissions.enquiriesTab")}</TabsTrigger>
          <TabsTrigger value="applications">{t("school.admissions.applicationsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="enquiries">
          <EnquiriesTab />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
