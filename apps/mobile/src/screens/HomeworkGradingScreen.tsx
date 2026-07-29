import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import {
  gradeHomeworkSubmission,
  listMyTeacherAssignments,
  listHomeworkSubmissions,
  listSectionHomework,
  type HomeworkSubmissionItem,
  type MyTeacherAssignment,
  type SectionHomeworkItem,
} from "../lib/api-client";

/** Unit 45 — the teacher-side half of homework depth (submission upload is
 * parent/student-side, on ParentStudentHomeScreen). Pick a homework posted
 * for the active section, see who's submitted, enter a grade + feedback. */
export function HomeworkGradingScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [homeworkList, setHomeworkList] = useState<SectionHomeworkItem[]>([]);
  const [activeHomeworkId, setActiveHomeworkId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmissionItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => {
      setAssignments(items);
      setActive((prev) => prev ?? items[0] ?? null);
    });
  }, [session]);

  useEffect(() => {
    if (!session || !active) {
      setHomeworkList([]);
      return;
    }
    listSectionHomework(session.accessToken, active.sectionId).then((items) => {
      setHomeworkList(items);
      setActiveHomeworkId((prev) => prev ?? items[0]?.id ?? null);
    });
  }, [session, active]);

  const loadSubmissions = useCallback(async () => {
    if (!session || !activeHomeworkId) return;
    setLoading(true);
    try {
      const items = await listHomeworkSubmissions(session.accessToken, activeHomeworkId);
      setSubmissions(items);
      const nextDrafts: Record<string, { grade: string; feedback: string }> = {};
      for (const s of items) {
        nextDrafts[s.id] = { grade: s.grade ?? "", feedback: s.feedback ?? "" };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session, activeHomeworkId, t]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const save = useCallback(
    async (submissionId: string) => {
      if (!session) return;
      const draft = drafts[submissionId];
      if (!draft?.grade) return;
      setSavingId(submissionId);
      try {
        await gradeHomeworkSubmission(session.accessToken, submissionId, {
          grade: draft.grade,
          feedback: draft.feedback || undefined,
        });
        Alert.alert(t("homework.gradeSavedTitle"));
      } catch (err) {
        Alert.alert(t("attendance.errorTitle"), (err as Error).message);
      } finally {
        setSavingId(null);
      }
    },
    [session, drafts, t]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("homework.gradingTitle")}</Text>
      <SectionPicker assignments={assignments} activeAssignmentId={active?.id ?? null} onSelect={setActive} />

      <View style={styles.homeworkRow}>
        {homeworkList.map((hw) => (
          <TouchableOpacity
            key={hw.id}
            style={[styles.homeworkChip, hw.id === activeHomeworkId ? styles.homeworkChipActive : null]}
            onPress={() => setActiveHomeworkId(hw.id)}
          >
            <Text numberOfLines={1}>{hw.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.submissionRow}>
              <Text style={styles.studentId}>{item.studentId}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("homework.gradePlaceholder") as string}
                value={drafts[item.id]?.grade ?? ""}
                onChangeText={(v) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id]!, grade: v } }))}
              />
              <TextInput
                style={styles.input}
                placeholder={t("homework.feedbackPlaceholder") as string}
                value={drafts[item.id]?.feedback ?? ""}
                onChangeText={(v) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id]!, feedback: v } }))}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => save(item.id)}
                disabled={savingId === item.id}
              >
                <Text style={styles.saveButtonText}>
                  {savingId === item.id ? t("homework.saving") : t("homework.save")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t("homework.noSubmissions")}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  homeworkRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  homeworkChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#F3F4F6", maxWidth: 160 },
  homeworkChipActive: { backgroundColor: "#DCFCE7" },
  submissionRow: { gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  studentId: { fontSize: 12, color: "#6B7280" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 8 },
  saveButton: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  empty: { textAlign: "center", color: "#6B7280", paddingVertical: 24 },
});
