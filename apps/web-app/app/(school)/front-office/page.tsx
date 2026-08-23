"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function VisitorsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", purpose: "" });

  const visitorsQuery = useQuery({
    queryKey: ["frontoffice-visitors", branchId],
    queryFn: () => adminApi.listVisitors(branchId),
    enabled: !!branchId,
  });

  const checkInMutation = useMutation({
    mutationFn: () => adminApi.checkInVisitor({ branchId, ...form }),
    onSuccess: () => {
      setForm({ name: "", purpose: "" });
      void queryClient.invalidateQueries({ queryKey: ["frontoffice-visitors", branchId] });
    },
  });
  const checkOutMutation = useMutation({
    mutationFn: (id: string) => adminApi.checkOutVisitor(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["frontoffice-visitors", branchId] }),
  });

  const visitors = visitorsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.frontOffice.visitorName") as string}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.frontOffice.purpose") as string}
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        />
        <Button onClick={() => checkInMutation.mutate()} disabled={!form.name || !form.purpose}>
          {t("school.frontOffice.checkIn")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.frontOffice.visitorName")}</TableHead>
            <TableHead>{t("school.frontOffice.purpose")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.name}</TableCell>
              <TableCell>{v.purpose}</TableCell>
              <TableCell>{v.checkOutAt ? t("school.frontOffice.checkedOut") : t("school.frontOffice.onPremises")}</TableCell>
              <TableCell>
                {!v.checkOutAt ? (
                  <Button variant="outline" size="sm" onClick={() => checkOutMutation.mutate(v.id)}>
                    {t("school.frontOffice.checkOut")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GatePassesTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentId: "", reason: "" });

  const gatePassesQuery = useQuery({
    queryKey: ["frontoffice-gatepasses", branchId],
    queryFn: () => adminApi.listGatePasses(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createGatePass({ branchId, ...form }),
    onSuccess: () => {
      setForm({ studentId: "", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["frontoffice-gatepasses", branchId] });
    },
  });
  const exitMutation = useMutation({
    mutationFn: (id: string) => adminApi.exitGatePass(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["frontoffice-gatepasses", branchId] }),
  });

  const gatePasses = gatePassesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-secondary">{t("school.frontOffice.gatePassHint")}</p>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.frontOffice.studentId") as string}
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
        />
        <Input
          className="max-w-[12rem]"
          placeholder={t("school.frontOffice.reason") as string}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!form.studentId || !form.reason}>
          {t("school.frontOffice.approve")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.frontOffice.studentId")}</TableHead>
            <TableHead>{t("school.frontOffice.reason")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {gatePasses.map((g) => (
            <TableRow key={g.id}>
              <TableCell>{g.studentId}</TableCell>
              <TableCell>{g.reason}</TableCell>
              <TableCell>
                {!g.exitAt ? (
                  <Button variant="outline" size="sm" onClick={() => exitMutation.mutate(g.id)}>
                    {t("school.frontOffice.markExit")}
                  </Button>
                ) : (
                  t("school.frontOffice.exited")
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ComplaintsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ raisedByName: "", category: "", body: "" });

  const entriesQuery = useQuery({
    queryKey: ["frontoffice-complaints", branchId],
    queryFn: () => adminApi.listComplaintDeskEntries(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createComplaintDeskEntry({ branchId, ...form }),
    onSuccess: () => {
      setForm({ raisedByName: "", category: "", body: "" });
      void queryClient.invalidateQueries({ queryKey: ["frontoffice-complaints", branchId] });
    },
  });
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) => adminApi.resolveComplaintDeskEntry(id, resolution),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["frontoffice-complaints", branchId] }),
  });

  const entries = entriesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.frontOffice.raisedByName") as string}
          value={form.raisedByName}
          onChange={(e) => setForm({ ...form, raisedByName: e.target.value })}
        />
        <Input
          className="max-w-[8rem]"
          placeholder={t("school.frontOffice.category") as string}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.frontOffice.complaintBody") as string}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!form.raisedByName || !form.category || !form.body}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.frontOffice.raisedByName")}</TableHead>
            <TableHead>{t("school.frontOffice.category")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.raisedByName}</TableCell>
              <TableCell>{c.category}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell>
                {c.status === "OPEN" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveMutation.mutate({ id: c.id, resolution: "Resolved by front desk" })}
                  >
                    {t("school.frontOffice.resolve")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LogsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [callForm, setCallForm] = useState({ direction: "INCOMING", callerName: "" });
  const [postalForm, setPostalForm] = useState({ direction: "INWARD", description: "" });

  const callsQuery = useQuery({
    queryKey: ["frontoffice-calls", branchId],
    queryFn: () => adminApi.listCallLogEntries(branchId),
    enabled: !!branchId,
  });
  const postalQuery = useQuery({
    queryKey: ["frontoffice-postal", branchId],
    queryFn: () => adminApi.listPostalLogEntries(branchId),
    enabled: !!branchId,
  });

  const createCallMutation = useMutation({
    mutationFn: () => adminApi.createCallLogEntry({ branchId, ...callForm }),
    onSuccess: () => {
      setCallForm({ direction: "INCOMING", callerName: "" });
      void queryClient.invalidateQueries({ queryKey: ["frontoffice-calls", branchId] });
    },
  });
  const createPostalMutation = useMutation({
    mutationFn: () => adminApi.createPostalLogEntry({ branchId, ...postalForm }),
    onSuccess: () => {
      setPostalForm({ direction: "INWARD", description: "" });
      void queryClient.invalidateQueries({ queryKey: ["frontoffice-postal", branchId] });
    },
  });

  const calls = callsQuery.data?.data ?? [];
  const postal = postalQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.frontOffice.callLog")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="h-9 rounded-md border border-border px-2 text-sm"
            value={callForm.direction}
            onChange={(e) => setCallForm({ ...callForm, direction: e.target.value })}
          >
            <option value="INCOMING">INCOMING</option>
            <option value="OUTGOING">OUTGOING</option>
          </select>
          <Input
            className="max-w-[10rem]"
            placeholder={t("school.frontOffice.callerName") as string}
            value={callForm.callerName}
            onChange={(e) => setCallForm({ ...callForm, callerName: e.target.value })}
          />
          <Button onClick={() => createCallMutation.mutate()} disabled={!callForm.callerName}>
            {t("school.common.save")}
          </Button>
        </div>
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          {calls.map((c) => (
            <li key={c.id}>
              {c.direction} — {c.callerName}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.frontOffice.postalLog")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="h-9 rounded-md border border-border px-2 text-sm"
            value={postalForm.direction}
            onChange={(e) => setPostalForm({ ...postalForm, direction: e.target.value })}
          >
            <option value="INWARD">INWARD</option>
            <option value="OUTWARD">OUTWARD</option>
          </select>
          <Input
            className="max-w-[14rem]"
            placeholder={t("school.frontOffice.description") as string}
            value={postalForm.description}
            onChange={(e) => setPostalForm({ ...postalForm, description: e.target.value })}
          />
          <Button onClick={() => createPostalMutation.mutate()} disabled={!postalForm.description}>
            {t("school.common.save")}
          </Button>
        </div>
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          {postal.map((p) => (
            <li key={p.id}>
              {p.direction} — {p.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FrontOfficePage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.frontOffice.title")}</h1>
      <Tabs defaultValue="visitors">
        <TabsList>
          <TabsTrigger value="visitors">{t("school.frontOffice.visitorsTab")}</TabsTrigger>
          <TabsTrigger value="gatePasses">{t("school.frontOffice.gatePassesTab")}</TabsTrigger>
          <TabsTrigger value="complaints">{t("school.frontOffice.complaintsTab")}</TabsTrigger>
          <TabsTrigger value="logs">{t("school.frontOffice.logsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="visitors">
          <VisitorsTab />
        </TabsContent>
        <TabsContent value="gatePasses">
          <GatePassesTab />
        </TabsContent>
        <TabsContent value="complaints">
          <ComplaintsTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
