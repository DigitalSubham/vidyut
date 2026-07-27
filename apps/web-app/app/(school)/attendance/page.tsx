"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function today() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const [sectionId, setSectionId] = useState("");
  const [loadedSectionId, setLoadedSectionId] = useState("");
  const { month, year } = today();

  const registerQuery = useQuery({
    queryKey: ["attendance-register", loadedSectionId, month, year],
    queryFn: () => adminApi.getRegister(loadedSectionId, month, year),
    enabled: !!loadedSectionId,
  });
  const defaultersQuery = useQuery({
    queryKey: ["attendance-defaulters", branchId],
    queryFn: () => adminApi.getDefaulters(branchId),
    enabled: !!branchId,
  });

  const register = registerQuery.data?.data ?? [];
  const defaulters = defaultersQuery.data?.data ?? [];
  const dayColumns = Array.from(new Set(register.flatMap((row) => Object.keys(row.days)))).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.attendance.title")}</h1>
        <div className="flex items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder={t("school.attendance.sectionId") as string}
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          />
          <Button onClick={() => setLoadedSectionId(sectionId)}>{t("school.attendance.loadRegister")}</Button>
        </div>

        {registerQuery.isLoading ? (
          <p className="text-text-secondary">{t("school.common.loading")}</p>
        ) : register.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("school.students.name")}</TableHead>
                  {dayColumns.map((day) => (
                    <TableHead key={day}>{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {register.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>
                      {row.firstName} {row.lastName}
                    </TableCell>
                    {dayColumns.map((day) => (
                      <TableCell key={day}>{row.days[day]?.slice(0, 1) ?? "—"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold text-text-primary">{t("school.attendance.defaulters")}</h2>
        {defaultersQuery.isLoading ? (
          <p className="text-text-secondary">{t("school.common.loading")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.students.name")}</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defaulters.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    {row.firstName} {row.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.attendancePercent}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
