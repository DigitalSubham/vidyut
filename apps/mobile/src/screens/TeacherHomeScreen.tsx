import React, { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import { MarksEntryScreen } from "./MarksEntryScreen";
import { HomeworkPostScreen } from "./HomeworkPostScreen";
import { HomeworkGradingScreen } from "./HomeworkGradingScreen";
import { MessagesScreen } from "./MessagesScreen";
import { LeaveScreen } from "./LeaveScreen";
import { TeacherSummaryScreen } from "./TeacherSummaryScreen";
import { listMyTeacherAssignments, type MyTeacherAssignment } from "../lib/api-client";

/**
 * Lazy + error-boundary wrapped: this screen (via ../lib/database.ts)
 * constructs a WatermelonDB SQLiteAdapter at module scope, which calls the
 * native initializeJSI() synchronously. A plain top-level import pulls that
 * in for every role at app boot, even ones that never open this tab — and
 * it throws in Expo Go (no native module) or a stale dev client, crashing
 * the whole app before any screen renders. Deferring the import to first
 * render of this one tab, and catching the throw locally, keeps that
 * failure scoped to the tab that needs it.
 */
const LazyTeacherAttendanceScreen = React.lazy(() =>
  import("./TeacherAttendanceScreen").then((m) => ({ default: m.TeacherAttendanceScreen }))
);

class AttendanceErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <View style={styles.attendanceError}>
          <Text style={styles.attendanceErrorText}>
            Offline attendance needs a native dev client (WatermelonDB) — it isn't available in Expo Go.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AttendanceTab() {
  return (
    <AttendanceErrorBoundary>
      <Suspense fallback={null}>
        <LazyTeacherAttendanceScreen />
      </Suspense>
    </AttendanceErrorBoundary>
  );
}

type Tab = "attendance" | "marks" | "homework" | "grading" | "messages" | "leave" | "summary";

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
        {(["attendance", "marks", "homework", "grading", "messages", "leave", "summary"] as Tab[]).map((key) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key ? styles.tabActive : null]} onPress={() => setTab(key)}>
            <Text>{t(`teacherHome.tabs.${key}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {tab === "attendance" ? <AttendanceTab /> : null}
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
        {tab === "leave" && session && assignment ? (
          <LeaveScreen accessToken={session.accessToken} staffId={assignment.staffId} />
        ) : null}
        {tab === "summary" && session ? <TeacherSummaryScreen accessToken={session.accessToken} /> : null}
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
  attendanceError: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  attendanceErrorText: { textAlign: "center", color: "#6B7280" },
});
