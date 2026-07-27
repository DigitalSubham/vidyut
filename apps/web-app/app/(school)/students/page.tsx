"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

export default function StudentsListPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [search, setSearch] = useState("");

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Link href={`/students/${student.id}`} className="font-medium text-brand hover:underline">
                    {student.admissionNo}
                  </Link>
                </TableCell>
                <TableCell>
                  {student.firstName} {student.lastName}
                </TableCell>
                <TableCell className="text-text-secondary">{student.rollNo ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={student.status === "ACTIVE" ? "default" : "secondary"}>{student.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
