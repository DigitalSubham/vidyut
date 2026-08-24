import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getMyStudentTimeline, type MyTimelineEntry } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 66's zero-parent-visibility gap for a student's achievement/discipline/note log. */
export function TimelineScreen({ accessToken, studentId }: { accessToken: string; studentId: string }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<MyTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyStudentTimeline(accessToken, studentId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [accessToken, studentId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.type}>{item.type}</Text>
          <Text>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.occurredAt).toLocaleDateString()}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{t("timeline.none")}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  type: { fontWeight: "700", color: "#4F46E5", fontSize: 12, marginBottom: 2 },
  date: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
});
