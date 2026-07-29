import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getOnlineExamToTake, submitOnlineExam, type OnlineExamQuestionForStudent } from "../lib/api-client";

/**
 * Unit 46 — the student's MCQ-taking flow: fetch questions (answer key
 * stripped, per the backend's own self-scoped `/take` route), pick one
 * option per question locally, submit once. `onDone` returns to the exam
 * list with the score so the caller can refresh its own state.
 */
export function OnlineExamTaker({
  accessToken,
  examId,
  studentId,
  onDone,
}: {
  accessToken: string;
  examId: string;
  studentId: string;
  onDone: (result?: { score: number; maxScore: number }) => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<OnlineExamQuestionForStudent[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getOnlineExamToTake(accessToken, examId, studentId)
      .then(({ exam, questions: qs }) => {
        setTitle(exam.title);
        setQuestions(qs);
      })
      .catch((err) => Alert.alert(t("attendance.errorTitle"), (err as Error).message))
      .finally(() => setLoading(false));
  }, [accessToken, examId, studentId, t]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const orderedAnswers = questions.map((_, i) => answers[i] ?? -1);
      const result = await submitOnlineExam(accessToken, examId, { studentId, answers: orderedAnswers });
      onDone({ score: result.score, maxScore: result.maxScore });
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={() => onDone()}>
          <Text style={styles.cancelLink}>{t("onlineExams.cancel")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 16 }}>
        {questions.map((q, i) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionText}>
              {i + 1}. {q.questionText}
            </Text>
            {q.options.map((option, optIndex) => (
              <TouchableOpacity
                key={optIndex}
                style={[styles.optionRow, answers[i] === optIndex ? styles.optionRowActive : null]}
                onPress={() => setAnswers((prev) => ({ ...prev, [i]: optIndex }))}
              >
                <Text>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitting ? t("onlineExams.submitting") : t("onlineExams.submit")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "600" },
  cancelLink: { color: "#DC2626", fontWeight: "600" },
  questionBlock: { gap: 6 },
  questionText: { fontSize: 15, fontWeight: "500" },
  optionRow: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 10 },
  optionRowActive: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  submitButton: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  submitButtonText: { color: "#fff", fontWeight: "600" },
});
