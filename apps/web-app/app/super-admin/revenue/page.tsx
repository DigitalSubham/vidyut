"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformApi } from "@/lib/platform-client";

export default function RevenueSummaryPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "revenue", "summary"],
    queryFn: () => platformApi.getRevenueSummary(),
  });
  const summary = data?.data;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          {t("platform.revenue.title")}
        </h1>
        <Link href="/super-admin/tenants" className="text-sm text-brand hover:underline">
          {t("platform.revenue.backToTenants")}
        </Link>
      </div>
      {isLoading ? (
        <p className="text-text-secondary">{t("platform.common.loading")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">{t("platform.revenue.subscriptionRevenue")}</CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-2xl text-text-primary">
              ₹{((summary?.subscriptionRevenuePaise ?? 0) / 100).toFixed(2)}
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">{t("platform.revenue.platformFeeRevenue")}</CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-2xl text-text-primary">
              ₹{((summary?.platformFeeRevenuePaise ?? 0) / 100).toFixed(2)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
