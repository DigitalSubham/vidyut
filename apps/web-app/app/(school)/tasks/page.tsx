"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

export default function TasksPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ assignedToId: "", title: "", dueDate: "" });

  const tasksQuery = useQuery({
    queryKey: ["staff-tasks", branchId],
    queryFn: () => adminApi.listStaffTasks(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createStaffTask({ branchId, assignedToId: form.assignedToId, title: form.title, dueDate: form.dueDate || undefined }),
    onSuccess: () => {
      setForm({ assignedToId: "", title: "", dueDate: "" });
      void queryClient.invalidateQueries({ queryKey: ["staff-tasks", branchId] });
    },
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => adminApi.completeStaffTask(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["staff-tasks", branchId] }),
  });

  const tasks = tasksQuery.data?.data ?? [];

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.tasks.title")}</h1>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input
          className="max-w-[10rem]"
          placeholder={t("school.tasks.assignedToId") as string}
          value={form.assignedToId}
          onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
        />
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.tasks.taskTitle") as string}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <Button onClick={() => createMutation.mutate()} disabled={!form.assignedToId || !form.title}>
          {t("school.tasks.assign")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.tasks.assignedToId")}</TableHead>
            <TableHead>{t("school.tasks.taskTitle")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t2) => (
            <TableRow key={t2.id}>
              <TableCell>{t2.assignedToId}</TableCell>
              <TableCell>{t2.title}</TableCell>
              <TableCell>{t2.status}</TableCell>
              <TableCell>
                {t2.status === "OPEN" ? (
                  <Button variant="outline" size="sm" onClick={() => completeMutation.mutate(t2.id)}>
                    {t("school.tasks.markDone")}
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
