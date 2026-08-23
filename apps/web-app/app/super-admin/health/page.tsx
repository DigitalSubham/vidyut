"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { platformApi } from "@/lib/platform-client";

export default function HealthSummaryPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "health-summary"],
    queryFn: () => platformApi.getHealthSummary(),
    refetchInterval: 15000,
  });
  const summary = data?.data;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("platform.health.title")}</h1>
        <Link href="/super-admin/tenants" className="text-sm text-brand hover:underline">
          {t("platform.revenue.backToTenants")}
        </Link>
      </div>
      {isLoading || !summary ? (
        <p className="text-text-secondary">{t("platform.common.loading")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm text-text-secondary">{t("platform.health.database")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={summary.db ? "default" : "destructive"}>{summary.db ? "OK" : "DOWN"}</Badge>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm text-text-secondary">{t("platform.health.redis")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={summary.redis ? "default" : "destructive"}>{summary.redis ? "OK" : "DOWN"}</Badge>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm text-text-secondary">{t("platform.health.queueDepth")}</CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-2xl text-text-primary">
              {summary.queue.waiting + summary.queue.active}
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({t("platform.health.failed")}: {summary.queue.failed})
              </span>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm text-text-secondary">{t("platform.health.recentErrors")}</CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-2xl text-text-primary">{summary.recentErrorCount}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
