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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, getAdminBranchId, AdminApiError, type InvoiceItem } from "@/lib/admin-client";

function ChequesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "CLEARED" | "BOUNCED">("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["cheques", branchId, statusFilter],
    queryFn: () => adminApi.listCheques(branchId, statusFilter),
    enabled: !!branchId,
  });
  const cheques = data?.data ?? [];

  async function decide(paymentId: string, status: "CLEARED" | "BOUNCED") {
    await adminApi.updateChequeStatus(paymentId, status);
    await queryClient.invalidateQueries({ queryKey: ["cheques", branchId, statusFilter] });
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        className="w-fit rounded-md border border-border bg-bg-surface px-3 py-2 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
      >
        <option value="PENDING">{t("school.fees.chequeStatusPending")}</option>
        <option value="CLEARED">{t("school.fees.chequeStatusCleared")}</option>
        <option value="BOUNCED">{t("school.fees.chequeStatusBounced")}</option>
      </select>

      {!branchId ? (
        <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>
      ) : isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.fees.chequeNo")}</TableHead>
              <TableHead>{t("school.fees.bankName")}</TableHead>
              <TableHead>{t("school.fees.chequeDueDate")}</TableHead>
              <TableHead>{t("school.fees.amount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cheques.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.chequeNo}</TableCell>
                <TableCell>{c.bankName}</TableCell>
                <TableCell>{new Date(c.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>{formatPaise(c.payment.amount)}</TableCell>
                <TableCell>
                  {c.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(c.paymentId, "CLEARED")}>
                        {t("school.fees.markCleared")}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(c.paymentId, "BOUNCED")}>
                        {t("school.fees.markBounced")}
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={c.status === "CLEARED" ? "default" : "secondary"}>{c.status}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

const PAYMENT_MODES = ["CASH", "CHEQUE", "UPI", "CARD", "NETBANKING", "BANK", "WALLET"] as const;

function formatPaise(amount: number): string {
  return `₹${(amount / 100).toFixed(2)}`;
}

function ReconciliationTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["reconciliation", branchId, date],
    queryFn: () => adminApi.getReconciliation(branchId, date),
    enabled: !!branchId,
  });
  const result = data?.data;

  async function cancel(receiptId: string) {
    const reason = window.prompt(t("school.fees.cancelReasonPrompt") as string);
    if (!reason) return;
    await adminApi.cancelReceipt(receiptId, reason);
    await queryClient.invalidateQueries({ queryKey: ["reconciliation", branchId, date] });
  }

  function renderRows(payments: NonNullable<typeof result>["online" | "counter"]) {
    return payments.map((p) => (
      <TableRow key={p.id}>
        <TableCell>{p.mode}</TableCell>
        <TableCell>{formatPaise(p.amount)}</TableCell>
        <TableCell>{p.reference ?? "—"}</TableCell>
        <TableCell>
          {p.needsReview ? <Badge variant="secondary">{t("school.fees.needsReview")}</Badge> : null}
        </TableCell>
        <TableCell>
          {p.receipt ? (
            p.receipt.cancelledAt ? (
              <Badge variant="secondary">{t("school.fees.cancelled")}</Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => cancel(p.receipt!.id)}>
                {t("school.fees.cancelReceipt")}
              </Button>
            )
          ) : null}
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-4">
      <Input type="date" className="max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />

      {!branchId ? (
        <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>
      ) : isLoading ? (
        <p className="text-text-secondary">{t("school.common.loading")}</p>
      ) : (
        <>
          <div>
            <h2 className="mb-2 font-heading text-lg font-semibold text-text-primary">{t("school.fees.online")}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("school.fees.mode")}</TableHead>
                  <TableHead>{t("school.fees.amount")}</TableHead>
                  <TableHead>{t("school.fees.reference")}</TableHead>
                  <TableHead />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(result?.online ?? [])}</TableBody>
            </Table>
          </div>
          <div>
            <h2 className="mb-2 font-heading text-lg font-semibold text-text-primary">{t("school.fees.counter")}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("school.fees.mode")}</TableHead>
                  <TableHead>{t("school.fees.amount")}</TableHead>
                  <TableHead>{t("school.fees.reference")}</TableHead>
                  <TableHead />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows(result?.counter ?? [])}</TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export default function FeesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const branchId = getAdminBranchId() ?? "";
  const [collecting, setCollecting] = useState<InvoiceItem | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof PAYMENT_MODES)[number]>("CASH");
  const [chequeNo, setChequeNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");
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
        ...(mode === "CHEQUE" ? { chequeNo, bankName, chequeDueDate } : {}),
      });
      setCollecting(null);
      setAmount("");
      setChequeNo("");
      setBankName("");
      setChequeDueDate("");
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

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{t("school.fees.invoicesTab")}</TabsTrigger>
          <TabsTrigger value="reconciliation">{t("school.fees.reconciliationTab")}</TabsTrigger>
          <TabsTrigger value="cheques">{t("school.fees.chequesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
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
        </TabsContent>
        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>
        <TabsContent value="cheques">
          <ChequesTab />
        </TabsContent>
      </Tabs>

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
            {mode === "CHEQUE" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="chequeNo">{t("school.fees.chequeNo")}</Label>
                  <Input id="chequeNo" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bankName">{t("school.fees.bankName")}</Label>
                  <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="chequeDueDate">{t("school.fees.chequeDueDate")}</Label>
                  <Input
                    id="chequeDueDate"
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              onClick={submitPayment}
              disabled={
                submitting || !amount || (mode === "CHEQUE" && (!chequeNo || !bankName || !chequeDueDate))
              }
            >
              {submitting ? t("school.common.loading") : t("school.fees.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
