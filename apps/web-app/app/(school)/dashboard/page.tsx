"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-text-secondary">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl font-semibold text-text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary", branchId],
    queryFn: () => adminApi.getDashboardSummary(branchId),
    enabled: !!branchId,
  });
  const summary = data?.data;

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }
  if (isLoading || !summary) {
    return <p className="text-text-secondary">{t("school.common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.dashboard.title")}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("school.dashboard.collectionPercent")} value={`${summary.collectionPercent}%`} />
        <StatCard label={t("school.dashboard.totalDues")} value={`₹${(summary.totalDues / 100).toFixed(2)}`} />
        <StatCard
          label={t("school.dashboard.attendancePercent")}
          value={summary.attendancePercent === null ? "—" : `${summary.attendancePercent}%`}
        />
        <StatCard
          label={t("school.dashboard.admissionsFunnel")}
          value={`${summary.admissionsFunnel.enquiries} / ${summary.admissionsFunnel.applications} / ${summary.admissionsFunnel.converted}`}
        />
      </div>
    </div>
  );
}
