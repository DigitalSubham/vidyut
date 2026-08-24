import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getMyLibrary, type MyLibraryBook } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 58's zero-mobile-UI gap for a student's currently-issued books. */
export function LibraryScreen({ accessToken, studentId }: { accessToken: string; studentId: string }) {
  const { t } = useTranslation();
  const [books, setBooks] = useState<MyLibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyLibrary(accessToken, studentId)
      .then(setBooks)
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
      data={books}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title}>{item.bookTitle}</Text>
          <Text style={styles.author}>{item.author}</Text>
          <Text style={item.overdue ? styles.overdue : styles.due}>
            {t("library.due")} {new Date(item.dueAt).toLocaleDateString()}
            {item.overdue ? ` — ${t("library.overdue")}` : ""}
          </Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{t("library.noBooks")}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  title: { fontWeight: "600" },
  author: { color: "#6B7280", fontSize: 13 },
  due: { fontSize: 12, marginTop: 4 },
  overdue: { fontSize: 12, marginTop: 4, color: "#DC2626", fontWeight: "600" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
});
