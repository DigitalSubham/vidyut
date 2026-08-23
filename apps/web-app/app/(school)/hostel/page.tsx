"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function BlocksTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [loadedBlockId, setLoadedBlockId] = useState("");
  const [roomForm, setRoomForm] = useState({ roomNo: "", capacity: "" });

  const blocksQuery = useQuery({
    queryKey: ["hostel-blocks", branchId],
    queryFn: () => adminApi.listHostelBlocks(branchId),
    enabled: !!branchId,
  });
  const roomsQuery = useQuery({
    queryKey: ["hostel-rooms", loadedBlockId],
    queryFn: () => adminApi.listRooms(loadedBlockId),
    enabled: !!loadedBlockId,
  });

  const createBlockMutation = useMutation({
    mutationFn: () => adminApi.createHostelBlock({ branchId, name }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["hostel-blocks", branchId] });
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: () => adminApi.createRoom(loadedBlockId, { roomNo: roomForm.roomNo, capacity: Number(roomForm.capacity) }),
    onSuccess: () => {
      setRoomForm({ roomNo: "", capacity: "" });
      void queryClient.invalidateQueries({ queryKey: ["hostel-rooms", loadedBlockId] });
    },
  });

  const blocks = blocksQuery.data?.data ?? [];
  const rooms = roomsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end gap-2 rounded-lg border border-border p-4">
        <Input className="max-w-xs" placeholder={t("school.hostel.blockName") as string} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => createBlockMutation.mutate()} disabled={!name}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.hostel.blockName")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {blocks.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setLoadedBlockId(b.id)}>
                  {t("school.hostel.viewRooms")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loadedBlockId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.hostel.rooms")}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[8rem]"
              placeholder={t("school.hostel.roomNo") as string}
              value={roomForm.roomNo}
              onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })}
            />
            <Input
              className="max-w-[6rem]"
              type="number"
              placeholder={t("school.hostel.capacity") as string}
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
            />
            <Button onClick={() => createRoomMutation.mutate()} disabled={!roomForm.roomNo || !roomForm.capacity}>
              {t("school.common.save")}
            </Button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {rooms.map((r) => (
              <li key={r.id}>
                {r.roomNo} — {t("school.hostel.capacity")}: {r.capacity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AllocationsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentId: "", roomId: "", fromDate: "", feeAmountPaise: "" });

  const allocationsQuery = useQuery({
    queryKey: ["hostel-allocations", form.roomId],
    queryFn: () => adminApi.listRoomAllocations(form.roomId),
    enabled: !!form.roomId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createRoomAllocation({
        studentId: form.studentId,
        roomId: form.roomId,
        fromDate: form.fromDate,
        feeAmountPaise: Number(form.feeAmountPaise),
      }),
    onSuccess: () => {
      toast.success(t("school.hostel.allocated") as string);
      void queryClient.invalidateQueries({ queryKey: ["hostel-allocations", form.roomId] });
    },
    onError: () => toast.error(t("school.hostel.roomFull") as string),
  });

  const allocations = allocationsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">{t("school.hostel.allocationHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.hostel.studentId") as string}
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.hostel.roomId") as string}
          value={form.roomId}
          onChange={(e) => setForm({ ...form, roomId: e.target.value })}
        />
        <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
        <Input
          className="max-w-[8rem]"
          type="number"
          placeholder={t("school.hostel.feePaise") as string}
          value={form.feeAmountPaise}
          onChange={(e) => setForm({ ...form, feeAmountPaise: e.target.value })}
        />
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!form.studentId || !form.roomId || !form.fromDate || !form.feeAmountPaise}
        >
          {t("school.hostel.allocate")}
        </Button>
      </div>

      {form.roomId ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.hostel.studentId")}</TableHead>
              <TableHead>{t("school.hostel.fromDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.studentId}</TableCell>
                <TableCell>{new Date(a.fromDate).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

function AttendanceTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("PRESENT");

  const attendanceQuery = useQuery({
    queryKey: ["hostel-attendance", branchId, date],
    queryFn: () => adminApi.listHostelAttendance(branchId, date),
    enabled: !!branchId && !!date,
  });

  const markMutation = useMutation({
    mutationFn: () => adminApi.markHostelAttendance({ branchId, date, records: [{ studentId, status }] }),
    onSuccess: () => {
      setStudentId("");
      void queryClient.invalidateQueries({ queryKey: ["hostel-attendance", branchId, date] });
    },
  });

  const records = attendanceQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.hostel.studentId") as string}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <select className="h-9 rounded-md border border-border px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PRESENT">PRESENT</option>
          <option value="ABSENT">ABSENT</option>
          <option value="LATE">LATE</option>
          <option value="LEAVE">LEAVE</option>
        </select>
        <Button onClick={() => markMutation.mutate()} disabled={!date || !studentId}>
          {t("school.hostel.mark")}
        </Button>
      </div>

      {date ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.hostel.studentId")}</TableHead>
              <TableHead>{t("school.hostel.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.studentId}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

export default function HostelPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.hostel.title")}</h1>
      <Tabs defaultValue="blocks">
        <TabsList>
          <TabsTrigger value="blocks">{t("school.hostel.blocksTab")}</TabsTrigger>
          <TabsTrigger value="allocations">{t("school.hostel.allocationsTab")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("school.hostel.attendanceTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks">
          <BlocksTab />
        </TabsContent>
        <TabsContent value="allocations">
          <AllocationsTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
