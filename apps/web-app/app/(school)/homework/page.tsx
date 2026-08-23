"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

export default function HomeworkPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [sectionId, setSectionId] = useState("");
  const [loadedSectionId, setLoadedSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const listQuery = useQuery({
    queryKey: ["homework", loadedSectionId],
    queryFn: () => adminApi.listHomework(loadedSectionId),
    enabled: !!loadedSectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createHomework({ branchId, sectionId, subjectId, title, description, dueDate }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      toast.success(t("school.homework.created") as string);
      setLoadedSectionId(sectionId);
      void queryClient.invalidateQueries({ queryKey: ["homework", sectionId] });
    },
  });

  const homework = listQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-xl font-semibold text-text-primary">{t("school.homework.title")}</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.homework.newHomework")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.sectionId")}</Label>
            <Input className="max-w-xs" value={sectionId} onChange={(e) => setSectionId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.timetable.subjectId")}</Label>
            <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.engagement.fieldTitle")}</Label>
            <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.homework.dueDate")}</Label>
            <Input type="date" className="max-w-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.homework.description")}</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button
          className="w-fit"
          onClick={() => createMutation.mutate()}
          disabled={!sectionId || !subjectId || !title || !description}
        >
          {t("school.common.save")}
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.timetable.sectionId")}</Label>
          <Input className="max-w-xs" value={sectionId} onChange={(e) => setSectionId(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setLoadedSectionId(sectionId)}>
          {t("school.common.load")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.engagement.fieldTitle")}</TableHead>
            <TableHead>{t("school.timetable.subjectId")}</TableHead>
            <TableHead>{t("school.homework.dueDate")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {homework.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="font-medium">{h.title}</TableCell>
              <TableCell className="font-mono text-xs">{h.subjectId}</TableCell>
              <TableCell>{h.dueDate.slice(0, 10)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
