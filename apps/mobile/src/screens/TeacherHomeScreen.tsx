import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import { TeacherAttendanceScreen } from "./TeacherAttendanceScreen";
import { MarksEntryScreen } from "./MarksEntryScreen";
import { HomeworkPostScreen } from "./HomeworkPostScreen";
import { HomeworkGradingScreen } from "./HomeworkGradingScreen";
import { MessagesScreen } from "./MessagesScreen";
import { listMyTeacherAssignments, type MyTeacherAssignment } from "../lib/api-client";

type Tab = "attendance" | "marks" | "homework" | "grading" | "messages";

/** Unit 26 — the teacher's three surfaces (attendance already built in Unit
 * 16, marks + homework new) behind one tab row. Unit 45 adds a fourth:
 * grading student homework submissions. Unit 49 adds a fifth: async chat
 * with a guardian. */
export function TeacherHomeScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("attendance");
  const [assignment, setAssignment] = useState<MyTeacherAssignment | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => setAssignment(items[0] ?? null));
  }, [session]);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(["attendance", "marks", "homework", "grading", "messages"] as Tab[]).map((key) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key ? styles.tabActive : null]} onPress={() => setTab(key)}>
            <Text>{t(`teacherHome.tabs.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {tab === "attendance" ? <TeacherAttendanceScreen /> : null}
        {tab === "marks" ? <MarksEntryScreen /> : null}
        {tab === "homework" ? <HomeworkPostScreen /> : null}
        {tab === "grading" ? <HomeworkGradingScreen /> : null}
        {tab === "messages" && session && assignment ? (
          <MessagesScreen
            accessToken={session.accessToken}
            branchId={assignment.section.branchId}
            own={{ role: "staff", id: assignment.staffId }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 0, flexWrap: "wrap" },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: "#DCFCE7" },
  content: { flex: 1, paddingHorizontal: 16 },
});
