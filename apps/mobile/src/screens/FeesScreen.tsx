import React, { useMemo } from "react";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Download, Receipt, Wallet } from "lucide-react-native";
import type { MyFeeLedgerEntry } from "../lib/api-client";
import { colors } from "../theme";

type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED" | "OVERDUE";

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; fg: string }> = {
  PAID: { bg: colors.successTint, fg: colors.success },
  PENDING: { bg: colors.warningTint, fg: colors.warning },
  PARTIAL: { bg: colors.warningTint, fg: colors.warning },
  OVERDUE: { bg: colors.dangerTint, fg: colors.danger },
  CANCELLED: { bg: colors.mutedTint, fg: colors.muted },
};

/** DD/MM/YYYY per ui-context.md's stated date convention. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Indian digit grouping (₹1,20,000, not ₹120,000) per ui-context.md. Amounts are integer paise everywhere in this codebase (AGENTS.md #7). */
function formatINR(paise: number): string {
  const rupees = Math.round(Math.abs(paise) / 100);
  const digits = String(rupees);
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}` : lastThree;
  return `${paise < 0 ? "-" : ""}₹${grouped}`;
}

/**
 * True outstanding balance per invoice, not the raw invoice total: the API
 * ledger (apps/api/src/modules/payments/service.ts buildStudentFeeLedgerEntries)
 * always reports an invoice's *full* amount regardless of status, so a
 * PARTIAL invoice needs its linked payments subtracted to show what's
 * actually still owed — the status label alone isn't precise enough for a
 * number a parent is meant to trust.
 */
function useSummary(entries: MyFeeLedgerEntry[]) {
  return useMemo(() => {
    const paidByInvoice = new Map<string, number>();
    for (const e of entries) {
      if (e.type === "payment" && e.invoiceId) {
        paidByInvoice.set(e.invoiceId, (paidByInvoice.get(e.invoiceId) ?? 0) + e.amount);
      }
    }
    let totalDue = 0;
    let totalPaid = 0;
    for (const e of entries) {
      if (e.type === "invoice") {
        if (e.status !== "CANCELLED") {
          const paid = paidByInvoice.get(e.invoiceId ?? "") ?? 0;
          totalDue += Math.max(0, e.amount - paid);
        }
      } else {
        totalPaid += e.amount;
      }
    }
    return { totalDue, totalPaid };
  }, [entries]);
}

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  const style = STATUS_STYLE[(status as InvoiceStatus) ?? "PENDING"] ?? STATUS_STYLE.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{t(`me.fees.status.${status ?? "PENDING"}`)}</Text>
    </View>
  );
}

function LedgerCard({ entry, onPayNow }: { entry: MyFeeLedgerEntry; onPayNow: (entry: MyFeeLedgerEntry) => void }) {
  const { t } = useTranslation();

  if (entry.type === "payment") {
    return (
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: colors.successTint }]}>
          <CheckCircle2 size={20} color={colors.success} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {t("me.fees.paidVia")} {entry.mode ? t(`me.fees.mode.${entry.mode}`) : t("me.fees.payment")}
          </Text>
          <Text style={styles.cardMeta}>{formatDate(entry.date)}</Text>
        </View>
        <View style={styles.cardTrailing}>
          <Text style={[styles.amount, { color: colors.success }]}>{formatINR(entry.amount)}</Text>
          {entry.receiptDownloadUrl ? (
            <TouchableOpacity
              style={styles.receiptLink}
              onPress={() => Linking.openURL(entry.receiptDownloadUrl!)}
              accessibilityRole="button"
            >
              <Download size={13} color={colors.brand} />
              <Text style={styles.receiptLinkText}>{t("me.fees.downloadReceipt")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  const isSettled = entry.status === "PAID" || entry.status === "CANCELLED";

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: colors.brandTint }]}>
        <Receipt size={20} color={colors.brand} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{entry.periodLabel}</Text>
        <Text style={styles.cardMeta}>
          {t("me.fees.dueOn")} {formatDate(entry.date)}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge status={entry.status} />
        </View>
      </View>
      <View style={styles.cardTrailing}>
        <Text style={styles.amount}>{formatINR(entry.amount)}</Text>
        {!isSettled ? (
          <TouchableOpacity style={styles.payButton} onPress={() => onPayNow(entry)} accessibilityRole="button">
            <Text style={styles.payButtonText}>{t("me.fees.payNow")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function FeesScreen({
  entries,
  onPayNow,
}: {
  entries: MyFeeLedgerEntry[];
  onPayNow: (entry: MyFeeLedgerEntry) => void;
}) {
  const { t } = useTranslation();
  const { totalDue, totalPaid } = useSummary(entries);

  return (
    <FlatList
      style={styles.list}
      data={entries}
      keyExtractor={(item, index) => item.invoiceId ?? `${item.type}-${item.date}-${index}`}
      renderItem={({ item }) => <LedgerCard entry={item} onPayNow={onPayNow} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>{t("me.fees.summary.totalDue")}</Text>
              <Text style={[styles.summaryValue, totalDue > 0 ? { color: colors.danger } : { color: colors.success }]}>
                {formatINR(totalDue)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>{t("me.fees.summary.totalPaid")}</Text>
              <Text style={styles.summaryValue}>{formatINR(totalPaid)}</Text>
            </View>
          </View>
          {totalDue === 0 ? (
            <View style={styles.allClearRow}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={styles.allClearText}>{t("me.fees.summary.allClear")}</Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Wallet size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t("me.fees.empty")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bgBase },
  listContent: { padding: 16, paddingBottom: 32 },

  summaryCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryStat: { flex: 1, gap: 4 },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 16 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  summaryValue: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  allClearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  allClearText: { fontSize: 14, color: colors.success, fontWeight: "600" },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.bgSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  cardMeta: { fontSize: 13, color: colors.textSecondary },
  badgeRow: { flexDirection: "row", marginTop: 4 },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  cardTrailing: { alignItems: "flex-end", gap: 8 },
  amount: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  payButton: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  payButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  receiptLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  receiptLinkText: { color: colors.brand, fontWeight: "600", fontSize: 13 },

  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
