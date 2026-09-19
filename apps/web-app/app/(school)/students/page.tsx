"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferStudentDialog } from "@/components/transfer-student-dialog";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

export default function StudentsListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const [search, setSearch] = useState("");
  const [transferStudentId, setTransferStudentId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["students", branchId, search],
    queryFn: () => adminApi.listStudents(branchId, search || undefined),
    enabled: !!branchId,
  });
  const students = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.students.title")}</h1>
        <Button asChild>
          <Link href="/students/new">{t("school.students.add")}</Link>
        </Button>
      </div>

      <Input
        className="max-w-sm"
        placeholder={t("school.common.search") as string}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {!branchId ? (
        <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>
      ) : isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : students.length === 0 ? (
        <p className="text-text-secondary">{t("school.students.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.students.admissionNo")}</TableHead>
              <TableHead>{t("school.students.name")}</TableHead>
              <TableHead>{t("school.students.rollNo")}</TableHead>
              <TableHead>{t("school.students.status")}</TableHead>
              <TableHead className="text-right">{t("school.students.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.admissionNo}</TableCell>
                <TableCell>
                  {student.firstName} {student.lastName}
                </TableCell>
                <TableCell className="text-text-secondary">{student.rollNo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>{student.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("school.students.view") as string}
                      onClick={() => router.push(`/students/${student.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("school.students.edit") as string}
                      onClick={() => router.push(`/students/${student.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("school.students.lifecycle.transfer") as string}
                      onClick={() => setTransferStudentId(student.id)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {transferStudentId && (
        <TransferStudentDialog
          key={transferStudentId}
          studentId={transferStudentId}
          open={!!transferStudentId}
          onOpenChange={(open) => !open && setTransferStudentId(null)}
          onTransferred={() => void queryClient.invalidateQueries({ queryKey: ["students", branchId] })}
        />
      )}
    </div>
  );
}
