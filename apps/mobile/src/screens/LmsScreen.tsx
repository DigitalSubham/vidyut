import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getMyContentItems, getMyLiveClasses, type MyContentItem, type MyLiveClassLink } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 67's zero-mobile-access gap for the content library and live-class links. */
export function LmsScreen({ accessToken, studentId }: { accessToken: string; studentId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyContentItem[]>([]);
  const [liveClasses, setLiveClasses] = useState<MyLiveClassLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMyContentItems(accessToken, studentId), getMyLiveClasses(accessToken, studentId)])
      .then(([contentRes, liveRes]) => {
        setItems(contentRes);
        setLiveClasses(liveRes);
      })
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
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t("lms.liveClasses")}</Text>
      <FlatList
        data={liveClasses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(item.joinUrl)}>
            <Text>{new Date(item.startTime).toLocaleString()}</Text>
            <Text style={styles.joinLink}>{t("lms.join")}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("lms.noLiveClasses")}</Text>}
      />
      <Text style={styles.sectionTitle}>{t("lms.contentLibrary")}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL((item.linkUrl ?? item.fileUrl)!)}
          >
            <Text>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("lms.noContent")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontWeight: "700", fontSize: 14, marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  joinLink: { color: "#4F46E5", fontWeight: "700" },
  empty: { textAlign: "center", color: "#6B7280", marginVertical: 12 },
});
