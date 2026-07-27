import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Q } from "@nozbe/watermelondb";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import {
  listMyTeacherAssignments,
  listSectionStudents,
  pushAttendance,
  type MyTeacherAssignment,
  type StudentListItem,
} from "../lib/api-client";
import { database, AttendanceRecordModel } from "../lib/database";

const STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;
type Status = (typeof STATUSES)[number];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Teacher's offline-first roster (context/feature-specs/16 scope #1-2).
 * Unit 26 replaces the manual branch/section entry with a real picker fed by
 * the caller's own assignments. Marks are written locally first, then
 * pushed on demand via Sync.
 */
export function TeacherAttendanceScreen() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const date = today();

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => {
      setAssignments(items);
      setActive((prev) => prev ?? items[0] ?? null);
    });
  }, [session]);

  const loadRoster = useCallback(async () => {
    if (!session || !active) return;
    setLoading(true);
    try {
      const items = await listSectionStudents(session.accessToken, active.section.branchId, active.sectionId);
      setStudents(items);

      const existing = await database
        .get<AttendanceRecordModel>("attendance_records")
        .query(Q.where("section_id", active.sectionId), Q.where("date", date))
        .fetch();
      const local: Record<string, Status> = {};
      for (const record of existing) {
        local[record.studentId] = record.status as Status;
      }
      setMarks(local);
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session, active, date, t]);

  const cycleStatus = useCallback(
    async (studentId: string) => {
      if (!active) return;
      const current = marks[studentId] ?? "PRESENT";
      const next = STATUSES[(STATUSES.indexOf(current) + 1) % STATUSES.length];
      setMarks((prev) => ({ ...prev, [studentId]: next }));

      await database.write(async () => {
        const existing = await database
          .get<AttendanceRecordModel>("attendance_records")
          .query(Q.where("student_id", studentId), Q.where("date", date))
          .fetch();
        if (existing[0]) {
          await existing[0].update((record) => {
            record.status = next;
            record.syncedAt = null;
          });
        } else {
          await database.get<AttendanceRecordModel>("attendance_records").create((record) => {
            record.branchId = active.section.branchId;
            record.sectionId = active.sectionId;
            record.studentId = studentId;
            record.date = date;
            record.status = next;
            record.syncedAt = null;
          });
        }
      });
    },
    [marks, active, date]
  );

  const sync = useCallback(async () => {
    if (!session || !active) return;
    const unsynced = await database
      .get<AttendanceRecordModel>("attendance_records")
      .query(Q.where("section_id", active.sectionId), Q.where("date", date), Q.where("synced_at", null))
      .fetch();
    if (unsynced.length === 0) return;

    setSyncing(true);
    try {
      await pushAttendance(session.accessToken, {
        branchId: active.section.branchId,
        sectionId: active.sectionId,
        date,
        records: unsynced.map((r) => ({ id: r.id, studentId: r.studentId, status: r.status })),
      });
      await database.write(async () => {
        for (const record of unsynced) {
          await record.update((r) => {
            r.syncedAt = Date.now();
          });
        }
      });
      Alert.alert(t("attendance.syncedTitle"), t("attendance.syncedBody", { count: unsynced.length }));
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSyncing(false);
    }
  }, [session, active, date, t]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{t("attendance.title")}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutLink}>{t("home.logout")}</Text>
        </TouchableOpacity>
      </View>

      <SectionPicker assignments={assignments} activeAssignmentId={active?.id ?? null} onSelect={setActive} />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.studentRow} onPress={() => cycleStatus(item.id)}>
              <Text style={styles.studentName}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={[styles.statusBadge, statusStyle(marks[item.id])]}>
                {t(`attendance.status.${marks[item.id] ?? "PRESENT"}`)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.syncButton} onPress={sync} disabled={syncing}>
        <Text style={styles.syncButtonText}>{syncing ? t("attendance.syncing") : t("attendance.sync")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function statusStyle(status?: Status) {
  if (status === "ABSENT") return { backgroundColor: "#FEE2E2", color: "#991B1B" };
  if (status === "LATE") return { backgroundColor: "#FEF3C7", color: "#92400E" };
  return { backgroundColor: "#DCFCE7", color: "#166534" };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", flex: 1 },
  logoutLink: { color: "#4F46E5", fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  studentName: { fontSize: 16 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, fontWeight: "600", fontSize: 12, overflow: "hidden" },
  syncButton: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  syncButtonText: { color: "#fff", fontWeight: "600" },
});
