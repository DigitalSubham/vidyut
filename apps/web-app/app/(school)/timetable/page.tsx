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
const GRID_DAYS = [0, 1, 2, 3, 4, 5] as const;
const GRID_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type DraftPeriod = { dayOfWeek: number; periodNo: number; subjectId: string; staffId: string; room?: string };

/** The one screen in this batch that's more than a plain table (spec scope #9) — a real day×period grid, not a flat list. */
function WeeklyGridEditor({
  branchId,
  sectionId,
}: {
  branchId: string;
  sectionId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [draft, setDraft] = useState<DraftPeriod[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [room, setRoom] = useState("");

  const periodsQuery = useQuery({
    queryKey: ["timetable", sectionId],
    queryFn: () => adminApi.listTimetable(sectionId),
    enabled: !!sectionId,
  });
  const existing = periodsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => adminApi.bulkUpsertTimetable({ branchId, sessionId, sectionId, periods: draft }),
    onSuccess: () => {
      setDraft([]);
      toast.success(t("school.timetable.gridSaved") as string);
      void queryClient.invalidateQueries({ queryKey: ["timetable", sectionId] });
    },
  });

  function cellContent(day: number, period: number) {
    const existingCell = existing.find((p) => p.dayOfWeek === day && p.periodNo === period);
    const draftCell = draft.find((p) => p.dayOfWeek === day && p.periodNo === period);
    return draftCell ?? existingCell ?? null;
  }

  function openCell(day: number, period: number) {
    const cell = cellContent(day, period);
    setSubjectId(cell?.subjectId ?? "");
    setStaffId(cell?.staffId ?? "");
    setRoom(cell?.room ?? "");
    setEditingCell({ day, period });
  }

  function addToDraft() {
    if (!editingCell) return;
    const next = draft.filter((p) => !(p.dayOfWeek === editingCell.day && p.periodNo === editingCell.period));
    next.push({ dayOfWeek: editingCell.day, periodNo: editingCell.period, subjectId, staffId, room: room || undefined });
    setDraft(next);
    setEditingCell(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.timetable.weeklyGrid")}</h3>
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.sessionId")}</Label>
          <Input className="max-w-xs" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border p-2 text-left">{t("school.timetable.period")}</th>
              {GRID_DAYS.map((d) => (
                <th key={d} className="border border-border p-2 text-left">
                  {t(`school.timetable.days.${DAY_KEYS[d]}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRID_PERIODS.map((period) => (
              <tr key={period}>
                <td className="border border-border p-2 font-medium">{period}</td>
                {GRID_DAYS.map((day) => {
                  const cell = cellContent(day, period);
                  return (
                    <td
                      key={day}
                      className="cursor-pointer border border-border p-2 hover:bg-surface-secondary"
                      onClick={() => openCell(day, period)}
                    >
                      {cell ? (
                        <span className="text-xs">
                          {cell.subjectId}
                          <br />
                          {cell.staffId}
                        </span>
                      ) : (
                        <span className="text-text-secondary">+</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingCell ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
          <span className="text-sm text-text-secondary">
            {t(`school.timetable.days.${DAY_KEYS[editingCell.day]}`)} · {t("school.timetable.period")} {editingCell.period}
          </span>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.subjectId")}</Label>
            <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.staffId")}</Label>
            <Input className="max-w-xs" value={staffId} onChange={(e) => setStaffId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.room")}</Label>
            <Input className="max-w-xs" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <Button size="sm" onClick={addToDraft} disabled={!subjectId || !staffId}>
            {t("school.timetable.setCell")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditingCell(null)}>
            {t("school.common.cancel")}
          </Button>
        </div>
      ) : null}

      <Button
        className="w-fit"
        onClick={() => saveMutation.mutate()}
        disabled={!sessionId || !sectionId || draft.length === 0 || saveMutation.isPending}
      >
        {t("school.timetable.saveGrid")} ({draft.length})
      </Button>
    </div>
  );
}

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

      {loadedSectionId ? <WeeklyGridEditor branchId={branchId} sectionId={loadedSectionId} /> : null}

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
