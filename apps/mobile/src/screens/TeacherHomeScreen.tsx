import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Construction, Menu } from "lucide-react-native";
import { useAuth } from "../lib/auth-context";
import { AppDrawer } from "../components/AppDrawer";
import { getDatabase } from "../lib/database";
import { TEACHER_MENU_GROUP_KEYS, TEACHER_TAB_ICONS, type TeacherTab } from "../lib/teacher-menu";
import { colors } from "../theme";
import { MarksEntryScreen } from "./MarksEntryScreen";
import { HomeworkPostScreen } from "./HomeworkPostScreen";
import { HomeworkGradingScreen } from "./HomeworkGradingScreen";
import { MessagesScreen } from "./MessagesScreen";
import { LeaveScreen } from "./LeaveScreen";
import { TeacherSummaryScreen } from "./TeacherSummaryScreen";
import { TeacherAttendanceScreen } from "./TeacherAttendanceScreen";
import { listMyTeacherAssignments, type MyTeacherAssignment } from "../lib/api-client";

function AttendanceUnavailable() {
  const { t } = useTranslation();
  return (
    <View style={styles.attendanceError}>
      <View style={styles.attendanceErrorIcon}>
        <Construction size={28} color={colors.warning} />
      </View>
      <Text style={styles.attendanceErrorTitle}>{t("teacherHome.attendanceUnavailable.title")}</Text>
      <Text style={styles.attendanceErrorBody}>{t("teacherHome.attendanceUnavailable.body")}</Text>
    </View>
  );
}

/**
 * ../lib/database.ts's getDatabase() is a lazy singleton — merely importing
 * TeacherAttendanceScreen (a plain static import now, above) can never
 * crash, since nothing there touches WatermelonDB at module scope either.
 * Only *calling* getDatabase() can throw (native module absent — Expo Go
 * or a stale dev client), so this check does exactly that once, up front,
 * and shows the same friendly fallback instead of mounting a screen whose
 * own data-loading would otherwise hit that error on the first render.
 *
 * This replaces an earlier React.lazy()/Suspense/class-ErrorBoundary
 * version of this same idea, which had its own separate bug under this
 * app's Metro setup ("Element type is invalid... resolves to undefined") —
 * a synchronous try/catch sidesteps that entire mechanism.
 */
function AttendanceTab() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      getDatabase();
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }, []);

  if (available === null) return null;
  if (!available) return <AttendanceUnavailable />;
  return <TeacherAttendanceScreen />;
}

/** Unit 26 — the teacher's three surfaces (attendance already built in Unit
 * 16, marks + homework new) behind one tab row. Unit 45 adds a fourth:
 * grading student homework submissions. Unit 49 adds a fifth: async chat
 * with a guardian. */
export function TeacherHomeScreen() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const [tab, setTab] = useState<TeacherTab>("summary");
  const [assignment, setAssignment] = useState<MyTeacherAssignment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => setAssignment(items[0] ?? null));
  }, [session]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("home.openMenu")}
        >
          <Menu size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(`teacherHome.tabs.${tab}`)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <AppDrawer<TeacherTab>
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={TEACHER_MENU_GROUP_KEYS.map((group) => ({ label: t(`teacherHome.menuGroups.${group.label}`), items: group.items }))}
        activeItem={tab}
        onSelect={setTab}
        getLabel={(key) => t(`teacherHome.tabs.${key}`)}
        getIcon={(key) => TEACHER_TAB_ICONS[key]}
        brandName={t("app.name")}
        subtitle={assignment ? `${assignment.subject.name} — ${assignment.section.class.name} ${assignment.section.name}` : undefined}
        onLogout={logout}
        logoutLabel={t("home.logout")}
      />

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: colors.textPrimary },
  content: { flex: 1, paddingHorizontal: 16 },
  attendanceError: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  attendanceErrorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warningTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attendanceErrorTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  attendanceErrorBody: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
});
