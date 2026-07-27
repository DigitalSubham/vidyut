"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, getAdminBranchId, AdminApiError, type InvoiceItem } from "@/lib/admin-client";

const PAYMENT_MODES = ["CASH", "CHEQUE", "UPI", "CARD", "NETBANKING", "BANK", "WALLET"] as const;

export default function FeesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const [collecting, setCollecting] = useState<InvoiceItem | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof PAYMENT_MODES)[number]>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", branchId],
    queryFn: () => adminApi.listInvoices(branchId),
    enabled: !!branchId,
  });
  const invoices = data?.data ?? [];

  async function submitPayment() {
    if (!collecting) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminApi.collectPayment({
        branchId,
        studentId: collecting.studentId,
        invoiceId: collecting.id,
        amount: Math.round(Number(amount) * 100),
        mode,
      });
      setCollecting(null);
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["invoices", branchId] });
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.fees.title")}</h1>

      {!branchId ? (
        <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>
      ) : isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.fees.invoiceNumber")}</TableHead>
              <TableHead>{t("school.fees.period")}</TableHead>
              <TableHead>{t("school.fees.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{invoice.periodLabel}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>{invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  {invoice.status !== "PAID" ? (
                    <Button size="sm" onClick={() => setCollecting(invoice)}>
                      {t("school.fees.collectPayment")}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!collecting} onOpenChange={(open) => !open && setCollecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("school.fees.collectPayment")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">{t("school.fees.amount")}</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.fees.mode")}</Label>
              <select
                className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value as (typeof PAYMENT_MODES)[number])}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button onClick={submitPayment} disabled={submitting || !amount}>
              {submitting ? t("school.common.loading") : t("school.fees.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
