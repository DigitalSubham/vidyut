"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

const ROLES = ["OWNER", "PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER", "PARENT", "STUDENT"];

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [classIds, setClassIds] = useState("");

  const listQuery = useQuery({
    queryKey: ["announcements", branchId],
    queryFn: () => adminApi.listAnnouncements(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createAnnouncement({
        branchId,
        title,
        body,
        audience: {
          ...(roles.length ? { roles } : {}),
          ...(classIds ? { classIds: classIds.split(",").map((c) => c.trim()) } : {}),
        },
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setRoles([]);
      setClassIds("");
      toast.success(t("school.announcements.created") as string);
      void queryClient.invalidateQueries({ queryKey: ["announcements", branchId] });
    },
  });

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const announcements = listQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-xl font-semibold text-text-primary">{t("school.announcements.title")}</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.announcements.newAnnouncement")}</h3>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.fieldTitle")}</Label>
          <Input className="max-w-md" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.body")}</Label>
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.announcements.audienceRoles")}</Label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  roles.includes(role) ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.engagement.classIdsOptional")}</Label>
          <Input className="max-w-md" value={classIds} onChange={(e) => setClassIds(e.target.value)} />
        </div>
        <Button className="w-fit" onClick={() => createMutation.mutate()} disabled={!title || !body}>
          {t("school.common.save")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.fieldTitle")}</TableHead>
            <TableHead>{t("school.announcements.audienceRoles")}</TableHead>
            <TableHead>{t("school.engagement.publishedAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell>
                {(a.audience?.roles ?? []).map((r) => (
                  <Badge key={r} variant="outline" className="mr-1">
                    {r}
                  </Badge>
                ))}
              </TableCell>
              <TableCell>{new Date(a.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
