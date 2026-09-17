import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react-native";
import type { MyAttendanceRecord } from "../lib/api-client";
import { colors } from "../theme";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "HALF_DAY" | "HOLIDAY";

const STATUS_STYLE: Record<AttendanceStatus, { bg: string; fg: string }> = {
  PRESENT: { bg: colors.successTint, fg: colors.success },
  ABSENT: { bg: colors.dangerTint, fg: colors.danger },
  LATE: { bg: colors.warningTint, fg: colors.warning },
  HALF_DAY: { bg: colors.warningTint, fg: colors.warning },
  LEAVE: { bg: colors.mutedTint, fg: colors.muted },
  HOLIDAY: { bg: colors.mutedTint, fg: colors.muted },
};

/** DD/MM/YYYY per ui-context.md's stated date convention — same helper as FeesScreen. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const style = STATUS_STYLE[status as AttendanceStatus] ?? STATUS_STYLE.PRESENT;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{t(`attendance.status.${status}`)}</Text>
    </View>
  );
}

export function AttendanceScreen({
  records,
  month,
  year,
  onShiftMonth,
  canGoForward,
}: {
  records: MyAttendanceRecord[];
  month: number; // 1-12
  year: number;
  onShiftMonth: (delta: -1 | 1) => void;
  canGoForward: boolean;
}) {
  const { t } = useTranslation();
  const monthNames = t("me.attendance.months", { returnObjects: true }) as string[];

  const summary = useMemo(() => {
    const schoolDays = records.filter((r) => r.status !== "HOLIDAY");
    const present = schoolDays.filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY").length;
    const pct = schoolDays.length > 0 ? Math.round((present / schoolDays.length) * 100) : 0;
    return { present, total: schoolDays.length, pct };
  }, [records]);

  return (
    <FlatList
      style={styles.list}
      data={records}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          <StatusBadge status={item.status} />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => onShiftMonth(-1)} accessibilityRole="button" hitSlop={8} style={styles.navButton}>
              <ChevronLeft size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {monthNames[month - 1]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => onShiftMonth(1)}
              disabled={!canGoForward}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.navButton}
            >
              <ChevronRight size={20} color={canGoForward ? colors.textSecondary : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {summary.total > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryPct}>{summary.pct}%</Text>
              <Text style={styles.summaryLabel}>
                {t("me.attendance.summary", { present: summary.present, total: summary.total, pct: summary.pct })}
              </Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <CalendarX size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t("me.attendance.empty")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bgBase },
  listContent: { padding: 16, paddingBottom: 32 },

  headerBlock: { marginBottom: 16, gap: 12 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navButton: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  summaryPct: { fontSize: 28, fontWeight: "800", color: colors.brand, fontVariant: ["tabular-nums"] },
  summaryLabel: { flex: 1, fontSize: 14, color: colors.textSecondary },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardDate: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
