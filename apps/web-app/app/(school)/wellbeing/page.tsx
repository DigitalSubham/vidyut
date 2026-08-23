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

function HealthDisciplineAwardsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [healthForm, setHealthForm] = useState({ condition: "", emergencyContact: "" });
  const [disciplineForm, setDisciplineForm] = useState({ type: "MERIT", points: "", note: "" });
  const [awardForm, setAwardForm] = useState({ title: "", awardedAt: "" });

  const healthQuery = useQuery({
    queryKey: ["wellbeing-health", studentId],
    queryFn: () => adminApi.getHealthRecord(studentId),
    enabled: !!studentId,
  });
  const disciplineQuery = useQuery({
    queryKey: ["wellbeing-discipline", studentId],
    queryFn: () => adminApi.listDisciplineIncidents(studentId),
    enabled: !!studentId,
  });
  const awardsQuery = useQuery({
    queryKey: ["wellbeing-awards", studentId],
    queryFn: () => adminApi.listAwards(studentId),
    enabled: !!studentId,
  });

  const saveHealthMutation = useMutation({
    mutationFn: () => adminApi.upsertHealthRecord({ branchId, studentId, ...healthForm }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["wellbeing-health", studentId] }),
  });
  const createDisciplineMutation = useMutation({
    mutationFn: () =>
      adminApi.createDisciplineIncident({ branchId, studentId, type: disciplineForm.type, points: Number(disciplineForm.points), note: disciplineForm.note || undefined }),
    onSuccess: () => {
      setDisciplineForm({ type: "MERIT", points: "", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-discipline", studentId] });
    },
  });
  const createAwardMutation = useMutation({
    mutationFn: () => adminApi.createAward({ branchId, studentId, ...awardForm }),
    onSuccess: () => {
      setAwardForm({ title: "", awardedAt: "" });
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-awards", studentId] });
    },
  });

  const health = healthQuery.data?.data;
  const incidents = disciplineQuery.data?.data ?? [];
  const awards = awardsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Input
        className="max-w-xs"
        placeholder={t("school.wellbeing.studentId") as string}
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />

      {studentId ? (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.wellbeing.health")}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                className="max-w-[10rem]"
                placeholder={t("school.wellbeing.condition") as string}
                value={healthForm.condition}
                onChange={(e) => setHealthForm({ ...healthForm, condition: e.target.value })}
              />
              <Input
                className="max-w-[10rem]"
                placeholder={t("school.wellbeing.emergencyContact") as string}
                value={healthForm.emergencyContact}
                onChange={(e) => setHealthForm({ ...healthForm, emergencyContact: e.target.value })}
              />
              <Button onClick={() => saveHealthMutation.mutate()} disabled={!healthForm.emergencyContact}>
                {t("school.common.save")}
              </Button>
            </div>
            {health ? (
              <p className="text-sm text-text-secondary">
                {health.condition ?? "—"} · {health.emergencyContact}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.wellbeing.discipline")}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <select
                className="h-9 rounded-md border border-border px-2 text-sm"
                value={disciplineForm.type}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, type: e.target.value })}
              >
                <option value="MERIT">MERIT</option>
                <option value="DEMERIT">DEMERIT</option>
              </select>
              <Input
                className="max-w-[6rem]"
                type="number"
                placeholder={t("school.wellbeing.points") as string}
                value={disciplineForm.points}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, points: e.target.value })}
              />
              <Input
                className="max-w-[14rem]"
                placeholder={t("school.wellbeing.note") as string}
                value={disciplineForm.note}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, note: e.target.value })}
              />
              <Button onClick={() => createDisciplineMutation.mutate()} disabled={!disciplineForm.points}>
                {t("school.common.save")}
              </Button>
            </div>
            <ul className="flex flex-col gap-1 text-sm text-text-secondary">
              {incidents.map((i) => (
                <li key={i.id}>
                  {i.type} +/-{i.points} {i.note ? `— ${i.note}` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="font-heading text-lg font-semibold text-text-primary">{t("school.wellbeing.awards")}</h3>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                className="max-w-[12rem]"
                placeholder={t("school.wellbeing.awardTitle") as string}
                value={awardForm.title}
                onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })}
              />
              <Input type="date" value={awardForm.awardedAt} onChange={(e) => setAwardForm({ ...awardForm, awardedAt: e.target.value })} />
              <Button onClick={() => createAwardMutation.mutate()} disabled={!awardForm.title || !awardForm.awardedAt}>
                {t("school.common.save")}
              </Button>
            </div>
            <ul className="flex flex-col gap-1 text-sm text-text-secondary">
              {awards.map((a) => (
                <li key={a.id}>
                  {a.title} — {new Date(a.awardedAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CanteenTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const walletQuery = useQuery({
    queryKey: ["wellbeing-canteen", studentId],
    queryFn: () => adminApi.getCanteenWallet(studentId),
    enabled: !!studentId,
  });

  const creditMutation = useMutation({
    mutationFn: () => adminApi.creditCanteenWallet({ branchId, studentId, amountPaise: Number(amount), reason: reason || undefined }),
    onSuccess: () => {
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-canteen", studentId] });
    },
  });
  const debitMutation = useMutation({
    mutationFn: () => adminApi.debitCanteenWallet({ branchId, studentId, amountPaise: Number(amount), reason: reason || undefined }),
    onSuccess: () => {
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-canteen", studentId] });
    },
    onError: () => toast.error(t("school.wellbeing.insufficientBalance") as string),
  });

  const wallet = walletQuery.data?.data;

  return (
    <div className="flex flex-col gap-6">
      <Input
        className="max-w-xs"
        placeholder={t("school.wellbeing.studentId") as string}
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />

      {studentId ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-lg font-semibold text-text-primary">
            {t("school.wellbeing.balance")}: {wallet ? (wallet.balancePaise / 100).toFixed(2) : "0.00"}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              className="max-w-[8rem]"
              type="number"
              placeholder={t("school.wellbeing.amountPaise") as string}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              className="max-w-[10rem]"
              placeholder={t("school.wellbeing.reason") as string}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button onClick={() => creditMutation.mutate()} disabled={!amount}>
              {t("school.wellbeing.credit")}
            </Button>
            <Button variant="outline" onClick={() => debitMutation.mutate()} disabled={!amount}>
              {t("school.wellbeing.debit")}
            </Button>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {wallet?.txns.map((tx) => (
              <li key={tx.id}>
                {tx.type} {(tx.amount / 100).toFixed(2)} {tx.reason ? `— ${tx.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function LostFoundTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ itemDescription: "", foundLocation: "", foundAt: "" });

  const entriesQuery = useQuery({
    queryKey: ["wellbeing-lostfound", branchId],
    queryFn: () => adminApi.listLostFoundEntries(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createLostFoundEntry({ branchId, ...form }),
    onSuccess: () => {
      setForm({ itemDescription: "", foundLocation: "", foundAt: "" });
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-lostfound", branchId] });
    },
  });
  const claimMutation = useMutation({
    mutationFn: (id: string) => adminApi.claimLostFoundEntry(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["wellbeing-lostfound", branchId] }),
  });

  const entries = entriesQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.wellbeing.itemDescription") as string}
          value={form.itemDescription}
          onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
        />
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.wellbeing.foundLocation") as string}
          value={form.foundLocation}
          onChange={(e) => setForm({ ...form, foundLocation: e.target.value })}
        />
        <Input type="date" value={form.foundAt} onChange={(e) => setForm({ ...form, foundAt: e.target.value })} />
        <Button onClick={() => createMutation.mutate()} disabled={!form.itemDescription || !form.foundAt}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.wellbeing.itemDescription")}</TableHead>
            <TableHead>{t("school.wellbeing.foundLocation")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.itemDescription}</TableCell>
              <TableCell>{e.foundLocation ?? "—"}</TableCell>
              <TableCell>{e.status}</TableCell>
              <TableCell>
                {e.status === "UNCLAIMED" ? (
                  <Button variant="outline" size="sm" onClick={() => claimMutation.mutate(e.id)}>
                    {t("school.wellbeing.markClaimed")}
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

export default function WellbeingPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.wellbeing.title")}</h1>
      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">{t("school.wellbeing.healthTab")}</TabsTrigger>
          <TabsTrigger value="canteen">{t("school.wellbeing.canteenTab")}</TabsTrigger>
          <TabsTrigger value="lostFound">{t("school.wellbeing.lostFoundTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="health">
          <HealthDisciplineAwardsTab />
        </TabsContent>
        <TabsContent value="canteen">
          <CanteenTab />
        </TabsContent>
        <TabsContent value="lostFound">
          <LostFoundTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
