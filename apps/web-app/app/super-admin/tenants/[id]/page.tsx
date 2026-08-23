"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { platformApi } from "@/lib/platform-client";

const USAGE_KEYS = ["students", "users", "branches", "storageGb"] as const;

export default function TenantDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [branding, setBranding] = useState({ logoUrl: "", primaryColor: "", customDomain: "" });
  const [brandingInitialized, setBrandingInitialized] = useState(false);

  const tenantQuery = useQuery({
    queryKey: ["platform", "tenant", params.id],
    queryFn: () => platformApi.getTenant(params.id),
  });
  const usageQuery = useQuery({
    queryKey: ["platform", "tenant", params.id, "usage"],
    queryFn: () => platformApi.getUsage(params.id),
  });
  const invoicesQuery = useQuery({
    queryKey: ["platform", "tenant", params.id, "invoices"],
    queryFn: () => platformApi.listInvoices(params.id),
  });

  useEffect(() => {
    const tenant = tenantQuery.data?.data;
    if (tenant && !brandingInitialized) {
      setBranding({
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? "",
        customDomain: tenant.customDomain ?? "",
      });
      setBrandingInitialized(true);
    }
  }, [tenantQuery.data, brandingInitialized]);

  const brandingMutation = useMutation({
    mutationFn: () =>
      platformApi.patchTenantBranding(params.id, {
        ...(branding.logoUrl ? { logoUrl: branding.logoUrl } : {}),
        ...(branding.primaryColor ? { primaryColor: branding.primaryColor } : {}),
        ...(branding.customDomain ? { customDomain: branding.customDomain } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (nextStatus: "ACTIVE" | "SUSPENDED") =>
      platformApi.patchTenant(params.id, { status: nextStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id] });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      platformApi.createInvoice(params.id, { amount: Number(invoiceAmount), dueDate: invoiceDueDate }),
    onSuccess: () => {
      setInvoiceAmount("");
      setInvoiceDueDate("");
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id, "invoices"] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) => platformApi.markInvoicePaid(params.id, invoiceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id, "invoices"] });
    },
  });

  const rechargeMutation = useMutation({
    mutationFn: () => platformApi.rechargeWallet(params.id, Number(rechargeAmount)),
    onSuccess: () => {
      setRechargeAmount("");
      void queryClient.invalidateQueries({ queryKey: ["platform", "tenant", params.id, "usage"] });
    },
  });

  function handleCreateInvoice(e: FormEvent) {
    e.preventDefault();
    if (invoiceAmount && invoiceDueDate) createInvoiceMutation.mutate();
  }

  function handleRecharge(e: FormEvent) {
    e.preventDefault();
    if (rechargeAmount) rechargeMutation.mutate();
  }

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
              <div>
                <p className="text-sm text-text-muted">{t("platform.tenantDetail.smsWallet")}</p>
                <p className="font-heading text-lg text-text-primary">
                  ₹{(usage.smsWalletBalancePaise / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">{t("platform.branding.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              brandingMutation.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.branding.logoUrl")}</label>
              <Input
                className="w-64"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.branding.primaryColor")}</label>
              <Input
                className="w-32"
                placeholder="#4F46E5"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.branding.customDomain")}</label>
              <Input
                className="w-52"
                value={branding.customDomain}
                onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={brandingMutation.isPending}>
              {t("platform.branding.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">{t("platform.billing.walletRecharge")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecharge} className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.billing.amountPaise")}</label>
              <Input
                type="number"
                min={1}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" disabled={rechargeMutation.isPending}>
              {t("platform.billing.recharge")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">{t("platform.billing.invoices")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleCreateInvoice} className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.billing.amountPaise")}</label>
              <Input
                type="number"
                min={1}
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-muted">{t("platform.billing.dueDate")}</label>
              <Input
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              {t("platform.billing.createInvoice")}
            </Button>
          </form>

          {invoicesQuery.data?.data && invoicesQuery.data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("platform.billing.invoiceNo")}</TableHead>
                  <TableHead>{t("platform.billing.amountPaise")}</TableHead>
                  <TableHead>{t("platform.billing.dueDate")}</TableHead>
                  <TableHead>{t("platform.tenantDetail.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesQuery.data.data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNo}</TableCell>
                    <TableCell>₹{(invoice.amount / 100).toFixed(2)}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.status !== "PAID" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={markPaidMutation.isPending}
                          onClick={() => markPaidMutation.mutate(invoice.id)}
                        >
                          {t("platform.billing.markPaid")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-text-secondary">{t("platform.billing.noInvoices")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
