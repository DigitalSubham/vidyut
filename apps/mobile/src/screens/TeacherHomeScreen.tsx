import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { TeacherAttendanceScreen } from "./TeacherAttendanceScreen";
import { MarksEntryScreen } from "./MarksEntryScreen";
import { HomeworkPostScreen } from "./HomeworkPostScreen";

type Tab = "attendance" | "marks" | "homework";

/** Unit 26 — the teacher's three surfaces (attendance already built in Unit 16, marks + homework new) behind one tab row. */
export function TeacherHomeScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("attendance");

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(["attendance", "marks", "homework"] as Tab[]).map((key) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key ? styles.tabActive : null]} onPress={() => setTab(key)}>
            <Text>{t(`teacherHome.tabs.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {tab === "attendance" ? <TeacherAttendanceScreen /> : null}
        {tab === "marks" ? <MarksEntryScreen /> : null}
        {tab === "homework" ? <HomeworkPostScreen /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: "#DCFCE7" },
  content: { flex: 1 },
});
