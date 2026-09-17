import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, GraduationCap, PenLine, Users, UserCheck, UserX } from "lucide-react-native";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import {
  listExamSubjects,
  listExams,
  listMyTeacherAssignments,
  listSectionStudents,
  submitMarks,
  type ExamListItem,
  type ExamSubjectListItem,
  type MyTeacherAssignment,
  type StudentListItem,
} from "../lib/api-client";
import { colors } from "../theme";

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/**
 * Unit 26 — one-student-at-a-time entry (context/feature-specs/26's Open
 * Question 1), mirroring the tap-to-cycle rhythm of the attendance screen
 * rather than a spreadsheet-style grid, which doesn't fit a phone screen.
 */
export function MarksEntryScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [examSubject, setExamSubject] = useState<ExamSubjectListItem | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [marksInput, setMarksInput] = useState("");
  const [isAbsent, setIsAbsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => {
      setAssignments(items);
      setActive((prev) => prev ?? items[0] ?? null);
    });
  }, [session]);

  useEffect(() => {
    if (!session || !active) return;
    listExams(session.accessToken, active.section.branchId).then(setExams);
  }, [session, active]);

  const resolveExamSubject = useCallback(async () => {
    if (!session || !active || !activeExamId) return;
    const examSubjects: ExamSubjectListItem[] = await listExamSubjects(session.accessToken, activeExamId);
    const match = examSubjects.find(
      (es) => es.classId === active.section.classId && es.subjectId === active.subjectId
    );
    setExamSubject(match ?? null);
    if (!match) {
      Alert.alert(t("marks.noSchemeTitle"), t("marks.noSchemeBody"));
    }
  }, [session, active, activeExamId, t]);

  useEffect(() => {
    void resolveExamSubject();
  }, [resolveExamSubject]);

  const loadRoster = useCallback(async () => {
    if (!session || !active) return;
    setRosterLoading(true);
    setRosterError(null);
    try {
      const items = await listSectionStudents(session.accessToken, active.section.branchId, active.sectionId);
      setStudents(items);
      setIndex(0);
    } catch (err) {
      // This used to fail completely silently (no .catch() at all) — a
      // server-side pageSize validation mismatch (fixed separately in
      // api-client.ts) meant the roster call 400'd on every load, leaving
      // `students` at its initial empty array with zero indication why,
      // which read as "All students entered" even before entering any.
      setStudents([]);
      setRosterError((err as Error).message);
    } finally {
      setRosterLoading(false);
    }
  }, [session, active]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const currentStudent = students[index];
  const marksValue = Number(marksInput);
  const overMax = examSubject && marksInput.length > 0 && Number.isFinite(marksValue) && marksValue > examSubject.maxMarks;
  const canSubmit = !!currentStudent && (isAbsent || (marksInput.length > 0 && Number.isFinite(marksValue) && !overMax));

  const submitCurrent = useCallback(async () => {
    if (!session || !examSubject || !currentStudent) return;
    setSubmitting(true);
    try {
      await submitMarks(session.accessToken, {
        examSubjectId: examSubject.id,
        entries: [
          {
            studentId: currentStudent.id,
            marks: isAbsent ? undefined : Number(marksInput),
            isAbsent,
          },
        ],
      });
      setMarksInput("");
      setIsAbsent(false);
      setIndex((i) => Math.min(i + 1, students.length - 1));
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [session, examSubject, currentStudent, marksInput, isAbsent, students.length, t]);

  return (
    <View style={styles.container}>
      <SectionPicker assignments={assignments} activeAssignmentId={active?.id ?? null} onSelect={setActive} />

      <View style={styles.examBlock}>
        <View style={styles.examLabelRow}>
          <GraduationCap size={15} color={colors.textMuted} />
          <Text style={styles.examLabel}>{t("marks.examLabel")}</Text>
        </View>
        <View style={styles.examRow}>
          {exams.map((exam) => {
            const activeChip = exam.id === activeExamId;
            return (
              <TouchableOpacity
                key={exam.id}
                style={[styles.examChip, activeChip ? styles.examChipActive : null]}
                onPress={() => setActiveExamId(exam.id)}
              >
                <Text style={[styles.examChipText, activeChip ? styles.examChipTextActive : null]}>{exam.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!examSubject ? (
        <View style={styles.hintBlock}>
          <PenLine size={28} color={colors.textMuted} />
          <Text style={styles.hintText}>{t("marks.selectExamHint")}</Text>
        </View>
      ) : rosterLoading ? (
        <View style={styles.hintBlock}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : rosterError ? (
        <View style={styles.hintBlock}>
          <AlertCircle size={28} color={colors.danger} />
          <Text style={styles.errorText}>{rosterError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadRoster()}>
            <Text style={styles.retryButtonText}>{t("marks.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.hintBlock}>
          <Users size={28} color={colors.textMuted} />
          <Text style={styles.hintText}>{t("marks.noStudents")}</Text>
        </View>
      ) : !currentStudent ? (
        <View style={styles.hintBlock}>
          <CheckCircle2 size={32} color={colors.success} />
          <Text style={styles.doneText}>{t("marks.done")}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.progressLabel}>{t("marks.studentProgress", { current: index + 1, total: students.length })}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / students.length) * 100}%` }]} />
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(currentStudent.firstName, currentStudent.lastName)}</Text>
          </View>
          <Text style={styles.studentName}>
            {currentStudent.firstName} {currentStudent.lastName}
          </Text>
          <Text style={styles.admissionNo}>{t("marks.admissionNo", { no: currentStudent.admissionNo })}</Text>

          <View style={styles.inputBlock}>
            <TextInput
              style={[styles.marksInput, isAbsent ? styles.marksInputDisabled : null, overMax ? styles.marksInputError : null]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={marksInput}
              onChangeText={setMarksInput}
              editable={!isAbsent}
            />
            <Text style={styles.outOfMax}>{t("marks.outOfMax", { max: examSubject.maxMarks })}</Text>
          </View>

          <TouchableOpacity
            style={[styles.absentToggle, isAbsent ? styles.absentToggleActive : null]}
            onPress={() => setIsAbsent((a) => !a)}
            accessibilityRole="button"
          >
            {isAbsent ? <UserX size={16} color={colors.danger} /> : <UserCheck size={16} color={colors.textSecondary} />}
            <Text style={[styles.absentToggleText, isAbsent ? styles.absentToggleTextActive : null]}>
              {isAbsent ? t("marks.markPresent") : t("marks.markAbsent")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, !canSubmit || submitting ? styles.nextButtonDisabled : null]}
            onPress={submitCurrent}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextButtonText}>{t("marks.next")}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8, gap: 14 },

  examBlock: { gap: 6 },
  examLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  examLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.4, textTransform: "uppercase" },
  examRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  examChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  examChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  examChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  examChipTextActive: { color: "#FFFFFF" },

  hintBlock: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 56 },
  hintText: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  errorText: { color: colors.danger, textAlign: "center", fontSize: 14, paddingHorizontal: 16 },
  retryButton: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginTop: 4 },
  retryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  doneText: { color: colors.success, fontWeight: "700", fontSize: 16, textAlign: "center" },

  card: {
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginTop: 4,
  },
  progressLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  progressTrack: { width: "100%", height: 4, backgroundColor: colors.bgSubtle, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 2 },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: colors.brand },
  studentName: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  admissionNo: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },

  inputBlock: { alignItems: "center", gap: 4, marginVertical: 8 },
  marksInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    width: 140,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  marksInputDisabled: { backgroundColor: colors.bgSubtle, color: colors.textMuted },
  marksInputError: { borderColor: colors.danger },
  outOfMax: { fontSize: 12, color: colors.textMuted },

  absentToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
  },
  absentToggleActive: { backgroundColor: colors.dangerTint },
  absentToggleText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  absentToggleTextActive: { color: colors.danger },

  nextButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 4,
  },
  nextButtonDisabled: { backgroundColor: colors.muted },
  nextButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
