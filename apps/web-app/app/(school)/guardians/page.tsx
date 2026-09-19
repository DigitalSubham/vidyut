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
import { SearchableSelect } from "@/components/searchable-select";
import { adminApi, type GuardianItem, type Student } from "@/lib/admin-client";
import { useAdminBranchId } from "@/lib/use-admin-branch-id";

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
  const branchId = useAdminBranchId();

  const [linkStudent, setLinkStudent] = useState<Student | null>(null);
  const [linkGuardian, setLinkGuardian] = useState<GuardianItem | null>(null);

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
    mutationFn: () => adminApi.linkGuardianToStudent(linkStudent!.id, linkGuardian!.id),
    onSuccess: () => {
      setLinkStudent(null);
      setLinkGuardian(null);
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
            <Input
              className="max-w-xs"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.alternatePhone")}</Label>
            <Input
              className="max-w-xs"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
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
          <Button onClick={() => createMutation.mutate()} disabled={!name || phone.length !== 10}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.guardians.linkToStudent")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.student")}</Label>
            <SearchableSelect<Student>
              queryKey={["students-picker", branchId]}
              disabled={!branchId}
              fetchOptions={(query) => adminApi.listStudents(branchId, query || undefined).then((r) => r.data)}
              getId={(s) => s.id}
              getLabel={(s) => `${s.firstName} ${s.lastName} (${s.rollNo ? `Roll ${s.rollNo}` : `Adm. ${s.admissionNo}`})`}
              value={linkStudent}
              onChange={setLinkStudent}
              placeholder={t("school.guardians.searchStudent") as string}
              emptyText={t("school.guardians.noStudentsFound") as string}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.guardians.guardian")}</Label>
            <SearchableSelect<GuardianItem>
              queryKey={["guardians-picker"]}
              fetchOptions={(query) => adminApi.listGuardians(query || undefined).then((r) => r.data)}
              getId={(g) => g.id}
              getLabel={(g) => `${g.name} (${g.phone})`}
              value={linkGuardian}
              onChange={setLinkGuardian}
              placeholder={t("school.guardians.searchGuardian") as string}
              emptyText={t("school.guardians.noGuardiansFound") as string}
            />
          </div>
          <Button onClick={() => linkMutation.mutate()} disabled={!linkStudent || !linkGuardian}>
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
