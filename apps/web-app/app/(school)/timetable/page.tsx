"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default function TimetablePage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();

  const [sectionId, setSectionId] = useState("");
  const [loadedSectionId, setLoadedSectionId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [substituteStaffId, setSubstituteStaffId] = useState("");
  const [room, setRoom] = useState("");
  const [reason, setReason] = useState("");

  const todayList = useQuery({
    queryKey: ["substitutions-today", branchId],
    queryFn: () => adminApi.listSubstitutionsToday(branchId),
    enabled: !!branchId,
  });

  const periodsQuery = useQuery({
    queryKey: ["timetable", loadedSectionId],
    queryFn: () => adminApi.listTimetable(loadedSectionId),
    enabled: !!loadedSectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSubstitution({
        timetablePeriodId: selectedPeriodId,
        date: new Date().toISOString(),
        substituteStaffId,
        room: room || undefined,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success(t("school.timetable.substitutionCreated") as string);
      setSelectedPeriodId("");
      setSubstituteStaffId("");
      setRoom("");
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["substitutions-today", branchId] });
    },
  });

  const periods = periodsQuery.data?.data ?? [];
  const today = todayList.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.timetable.title")}</h1>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.timetable.today")}</h3>
        {today.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.timetable.period")}</TableHead>
                <TableHead>{t("school.timetable.section")}</TableHead>
                <TableHead>{t("school.timetable.subject")}</TableHead>
                <TableHead>{t("school.timetable.absentStaff")}</TableHead>
                <TableHead>{t("school.timetable.coveringStaff")}</TableHead>
                <TableHead>{t("school.timetable.room")}</TableHead>
                <TableHead>{t("school.timetable.reason")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {today.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.timetablePeriod.periodNo}</TableCell>
                  <TableCell>{s.timetablePeriod.section.name}</TableCell>
                  <TableCell>{s.timetablePeriod.subject.name}</TableCell>
                  <TableCell>{s.timetablePeriod.staff.user?.name ?? s.timetablePeriod.staff.id}</TableCell>
                  <TableCell>{s.substituteStaff.user?.name ?? s.substituteStaff.id}</TableCell>
                  <TableCell>{s.room ?? s.timetablePeriod.room ?? "—"}</TableCell>
                  <TableCell>{s.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-text-secondary">{t("school.timetable.noSubstitutionsToday")}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.timetable.newSubstitution")}</h3>

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.sectionId")}</Label>
            <Input className="max-w-xs" value={sectionId} onChange={(e) => setSectionId(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setLoadedSectionId(sectionId)}>
            {t("school.common.load")}
          </Button>
        </div>

        {periods.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>{t("school.timetable.day")}</TableHead>
                <TableHead>{t("school.timetable.period")}</TableHead>
                <TableHead>{t("school.timetable.subjectId")}</TableHead>
                <TableHead>{t("school.timetable.staffId")}</TableHead>
                <TableHead>{t("school.timetable.room")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id} className={selectedPeriodId === p.id ? "bg-surface-secondary" : undefined}>
                  <TableCell>
                    <input type="radio" checked={selectedPeriodId === p.id} onChange={() => setSelectedPeriodId(p.id)} />
                  </TableCell>
                  <TableCell>{t(`school.timetable.days.${DAY_KEYS[p.dayOfWeek]}`)}</TableCell>
                  <TableCell>{p.periodNo}</TableCell>
                  <TableCell>{p.subjectId}</TableCell>
                  <TableCell>{p.staffId}</TableCell>
                  <TableCell>{p.room ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.substituteStaffId")}</Label>
            <Input className="max-w-xs" value={substituteStaffId} onChange={(e) => setSubstituteStaffId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.roomOverride")}</Label>
            <Input className="max-w-xs" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.reason")}</Label>
            <Input className="max-w-xs" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!selectedPeriodId || !substituteStaffId || createMutation.isPending}
          >
            {t("school.timetable.assignSubstitute")}
          </Button>
        </div>
      </div>
    </div>
  );
}
