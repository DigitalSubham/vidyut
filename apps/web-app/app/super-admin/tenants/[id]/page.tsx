"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-client";

const USAGE_KEYS = ["students", "users", "branches", "storageGb"] as const;

export default function TenantDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const tenantQuery = useQuery({
    queryKey: ["platform", "tenant", params.id],
    queryFn: () => platformApi.getTenant(params.id),
  });
  const usageQuery = useQuery({
    queryKey: ["platform", "tenant", params.id, "usage"],
    queryFn: () => platformApi.getUsage(params.id),
  });

  const suspendMutation = useMutation({
    mutationFn: (nextStatus: "ACTIVE" | "SUSPENDED") =>
      platformApi.patchTenant(params.id, { status: nextStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id] });
    },
  });

  const tenant = tenantQuery.data?.data;
  const usage = usageQuery.data?.data;

  if (!tenant) {
    return <div className="p-6 text-text-secondary">{t("platform.common.loading")}</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">{tenant.name}</h1>
          <p className="text-text-secondary">{tenant.slug}</p>
        </div>
        <Button
          variant={tenant.status === "SUSPENDED" ? "default" : "destructive"}
          onClick={() => suspendMutation.mutate(tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}
          disabled={suspendMutation.isPending}
        >
          {tenant.status === "SUSPENDED"
            ? t("platform.tenantDetail.activate")
            : t("platform.tenantDetail.suspend")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("platform.tenantDetail.status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{tenant.status}</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("platform.tenantDetail.plan")}</CardTitle>
          </CardHeader>
          <CardContent>{tenant.plan?.name ?? "—"}</CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("platform.tenantDetail.appType")}</CardTitle>
          </CardHeader>
          <CardContent>{tenant.appType}</CardContent>
        </Card>
      </div>

      {usage && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("platform.tenantDetail.usage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {USAGE_KEYS.map((key) => (
                <div key={key}>
                  <p className="text-sm text-text-muted">{t(`platform.tenantDetail.${key}`)}</p>
                  <p className="font-heading text-lg text-text-primary">
                    {usage[key].used}
                    <span className="text-text-muted"> / {usage[key].limit ?? "∞"}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
