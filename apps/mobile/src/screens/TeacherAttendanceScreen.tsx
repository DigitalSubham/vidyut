import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Q } from "@nozbe/watermelondb";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import {
  listMyTeacherAssignments,
  listSectionStudents,
  listTimetablePeriods,
  pushAttendance,
  type MyTeacherAssignment,
  type StudentListItem,
  type TimetablePeriodItem,
} from "../lib/api-client";
import { database, AttendanceRecordModel } from "../lib/database";

const STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;
type Status = (typeof STATUSES)[number];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** JS Date.getDay() is 0=Sunday..6=Saturday; the server's own dayOfWeek is
 * 0=Monday..6=Sunday (context/feature-specs/22's own convention). */
function todayServerDayOfWeek(): number {
  return (new Date().getDay() + 6) % 7;
}

/**
 * Teacher's offline-first roster (context/feature-specs/16 scope #1-2).
 * Unit 26 replaces the manual branch/section entry with a real picker fed by
 * the caller's own assignments. Marks are written locally first, then
 * pushed on demand via Sync. Unit 44 adds an optional period selector
 * alongside the existing daily mode — `null` means daily, matching the
 * server's own AttendanceRecord.periodId nullability.
 */
export function TeacherAttendanceScreen() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [periods, setPeriods] = useState<TimetablePeriodItem[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!session || !active) {
      setPeriods([]);
      return;
    }
    setPeriodId(null);
    listTimetablePeriods(session.accessToken, active.sectionId)
      .then((items) => setPeriods(items.filter((p) => p.dayOfWeek === todayServerDayOfWeek()).sort((a, b) => a.periodNo - b.periodNo)))
      .catch(() => setPeriods([]));
  }, [session, active]);

  const loadRoster = useCallback(async () => {
    if (!session || !active) return;
    setLoading(true);
    try {
      const items = await listSectionStudents(session.accessToken, active.section.branchId, active.sectionId);
      setStudents(items);

      const existing = await database
        .get<AttendanceRecordModel>("attendance_records")
        .query(
          Q.where("section_id", active.sectionId),
          Q.where("date", date),
          Q.where("period_id", periodId)
        )
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
  }, [session, active, date, periodId, t]);

  const cycleStatus = useCallback(
    async (studentId: string) => {
      if (!active) return;
      const current = marks[studentId] ?? "PRESENT";
      const next = STATUSES[(STATUSES.indexOf(current) + 1) % STATUSES.length];
      setMarks((prev) => ({ ...prev, [studentId]: next }));

      await database.write(async () => {
        const existing = await database
          .get<AttendanceRecordModel>("attendance_records")
          .query(Q.where("student_id", studentId), Q.where("date", date), Q.where("period_id", periodId))
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
            record.periodId = periodId;
            record.status = next;
            record.syncedAt = null;
          });
        }
      });
    },
    [marks, active, date, periodId]
  );

  const sync = useCallback(async () => {
    if (!session || !active) return;
    const unsynced = await database
      .get<AttendanceRecordModel>("attendance_records")
      .query(
        Q.where("section_id", active.sectionId),
        Q.where("date", date),
        Q.where("period_id", periodId),
        Q.where("synced_at", null)
      )
      .fetch();
    if (unsynced.length === 0) return;

    setSyncing(true);
    try {
      await pushAttendance(session.accessToken, {
        branchId: active.section.branchId,
        sectionId: active.sectionId,
        date,
        periodId: periodId ?? undefined,
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
  }, [session, active, date, periodId, t]);

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

      {periods.length > 0 ? (
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodChip, periodId === null ? styles.periodChipActive : null]}
            onPress={() => setPeriodId(null)}
          >
            <Text>{t("attendance.daily")}</Text>
          </TouchableOpacity>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodChip, periodId === p.id ? styles.periodChipActive : null]}
              onPress={() => setPeriodId(p.id)}
            >
              <Text>
                {t("attendance.period")} {p.periodNo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

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
  periodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  periodChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#F3F4F6" },
  periodChipActive: { backgroundColor: "#DCFCE7" },
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
