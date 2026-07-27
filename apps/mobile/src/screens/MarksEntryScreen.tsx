import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
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
  const [examSubjectId, setExamSubjectId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
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
    setExamSubjectId(match?.id ?? null);
    if (!match) {
      Alert.alert(t("marks.noSchemeTitle"), t("marks.noSchemeBody"));
    }
  }, [session, active, activeExamId, t]);

  useEffect(() => {
    void resolveExamSubject();
  }, [resolveExamSubject]);

  useEffect(() => {
    if (!session || !active) return;
    listSectionStudents(session.accessToken, active.section.branchId, active.sectionId).then((items) => {
      setStudents(items);
      setIndex(0);
    });
  }, [session, active]);

  const currentStudent = students[index];

  const submitCurrent = useCallback(async () => {
    if (!session || !examSubjectId || !currentStudent) return;
    setSubmitting(true);
    try {
      await submitMarks(session.accessToken, {
        examSubjectId,
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
  }, [session, examSubjectId, currentStudent, marksInput, isAbsent, students.length, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("marks.title")}</Text>
      <SectionPicker assignments={assignments} activeAssignmentId={active?.id ?? null} onSelect={setActive} />

      <View style={styles.examRow}>
        {exams.map((exam) => (
          <TouchableOpacity
            key={exam.id}
            style={[styles.examChip, exam.id === activeExamId ? styles.examChipActive : null]}
            onPress={() => setActiveExamId(exam.id)}
          >
            <Text>{exam.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!examSubjectId ? (
        <Text style={styles.hint}>{t("marks.selectExamHint")}</Text>
      ) : !currentStudent ? (
        <Text style={styles.hint}>{t("marks.done")}</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.studentName}>
            {currentStudent.firstName} {currentStudent.lastName}
          </Text>
          <Text style={styles.progress}>
            {index + 1} / {students.length}
          </Text>
          <TextInput
            style={styles.marksInput}
            keyboardType="number-pad"
            placeholder={t("marks.marksPlaceholder") as string}
            value={marksInput}
            onChangeText={setMarksInput}
            editable={!isAbsent}
          />
          <TouchableOpacity style={styles.absentToggle} onPress={() => setIsAbsent((a) => !a)}>
            <Text>{isAbsent ? t("marks.markPresent") : t("marks.markAbsent")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={submitCurrent} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextButtonText}>{t("marks.next")}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  examRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  examChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#F3F4F6" },
  examChipActive: { backgroundColor: "#DCFCE7" },
  hint: { color: "#6B7280", textAlign: "center", marginTop: 24 },
  card: { gap: 12, alignItems: "center", paddingTop: 24 },
  studentName: { fontSize: 22, fontWeight: "600" },
  progress: { color: "#6B7280" },
  marksInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    textAlign: "center",
    width: 140,
  },
  absentToggle: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: "#FEF3C7" },
  nextButton: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  nextButtonText: { color: "#fff", fontWeight: "600" },
});
