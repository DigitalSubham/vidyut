"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { platformApi } from "@/lib/platform-client";

export default function TenantsListPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => platformApi.listTenants(),
  });
  const tenants = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">
          {t("platform.tenants.title")}
        </h1>
        <Button asChild>
          <Link href="/super-admin/tenants/new">{t("platform.tenants.create")}</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-text-secondary">{t("platform.common.loading")}</p>
      ) : tenants.length === 0 ? (
        <p className="text-text-secondary">{t("platform.tenants.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("platform.tenants.name")}</TableHead>
              <TableHead>{t("platform.tenants.slug")}</TableHead>
              <TableHead>{t("platform.tenants.status")}</TableHead>
              <TableHead>{t("platform.tenants.appType")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <Link
                    href={`/super-admin/tenants/${tenant.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {tenant.name}
                  </Link>
                </TableCell>
                <TableCell className="text-text-secondary">{tenant.slug}</TableCell>
                <TableCell>
                  <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell>{tenant.appType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
