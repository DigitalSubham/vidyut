import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getTeacherSummary, type TeacherSummary } from "../lib/api-client";

/** Gap-remediation pass — Unit 69's teacher-summary endpoint had no UI anywhere; this is the missing mobile card. */
export function TeacherSummaryScreen({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<TeacherSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTeacherSummary(accessToken)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading || !summary) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.value}>{summary.assignedSectionCount}</Text>
        <Text style={styles.label}>{t("teacherSummary.sections")}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.value}>{summary.attendanceMarkedPercent}%</Text>
        <Text style={styles.label}>{t("teacherSummary.attendanceMarked")}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.value}>{summary.homeworkPostedThisMonth}</Text>
        <Text style={styles.label}>{t("teacherSummary.homeworkThisMonth")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, paddingTop: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 16, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8 },
  value: { fontSize: 28, fontWeight: "700", color: "#4F46E5" },
  label: { color: "#6B7280", marginTop: 4 },
});
