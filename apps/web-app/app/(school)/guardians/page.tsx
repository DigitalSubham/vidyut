"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/admin-client";

const RELATIONS = ["FATHER", "MOTHER", "GUARDIAN", "OTHER"];

export default function GuardiansPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("FATHER");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");

  const [studentId, setStudentId] = useState("");
  const [guardianId, setGuardianId] = useState("");

  const guardiansQuery = useQuery({
    queryKey: ["guardians", search],
    queryFn: () => adminApi.listGuardians(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createGuardian({
        name,
        relation,
        phone,
        ...(alternatePhone ? { alternatePhone } : {}),
        whatsappOptIn,
        ...(email ? { email } : {}),
      }),
    onSuccess: () => {
      setName("");
      setPhone("");
      setAlternatePhone("");
      setWhatsappOptIn(false);
      setEmail("");
      toast.success(t("school.guardians.created") as string);
      void queryClient.invalidateQueries({ queryKey: ["guardians"] });
    },
  });

  const linkMutation = useMutation({
    mutationFn: () => adminApi.linkGuardianToStudent(studentId, guardianId),
    onSuccess: () => {
      setStudentId("");
      setGuardianId("");
      toast.success(t("school.guardians.linked") as string);
    },
  });

  const guardians = guardiansQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-xl font-semibold text-text-primary">{t("school.guardians.title")}</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.guardians.newGuardian")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.name")}</Label>
            <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.relation")}</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.phone")}</Label>
            <Input className="max-w-xs" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.alternatePhone")}</Label>
            <Input className="max-w-xs" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              id="whatsappOptIn"
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
            />
            <Label htmlFor="whatsappOptIn">{t("school.guardians.whatsappOptIn")}</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.email")}</Label>
            <Input className="max-w-xs" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!name || !phone}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.guardians.linkToStudent")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.studentId")}</Label>
            <Input className="max-w-xs" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.guardianId")}</Label>
            <Input className="max-w-xs" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} />
          </div>
          <Button onClick={() => linkMutation.mutate()} disabled={!studentId || !guardianId}>
            {t("school.guardians.link")}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.common.search")}</Label>
          <Input className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.guardians.name")}</TableHead>
            <TableHead>{t("school.guardians.relation")}</TableHead>
            <TableHead>{t("school.guardians.phone")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {guardians.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-medium">{g.name}</TableCell>
              <TableCell>{g.relation}</TableCell>
              <TableCell>{g.phone}</TableCell>
              <TableCell className="font-mono text-xs text-text-secondary">{g.id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
