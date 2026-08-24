import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { listSurveys, respondSurvey, type SurveyItem } from "../lib/api-client";

/** Gap-remediation pass — closes Unit 49's "mobile response UI not built" note; a poll (Unit 65's `isPoll` flag) is just a Survey with one single-choice question, same screen. */
export function SurveysScreen({ accessToken, branchId }: { accessToken: string; branchId: string }) {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<SurveyItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSurveys(await listSurveys(accessToken, branchId));
    } finally {
      setLoading(false);
    }
  }, [accessToken, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!activeSurvey) return;
    const payload = activeSurvey.questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => ({ questionId: q.id, answer: answers[q.id]! }));
    if (payload.length === 0) return;

    setSubmitting(true);
    try {
      await respondSurvey(accessToken, activeSurvey.id, payload);
      Alert.alert(t("surveys.submittedTitle"));
      setActiveSurvey(null);
      setAnswers({});
      await load();
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !activeSurvey) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (activeSurvey) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setActiveSurvey(null)}>
          <Text style={styles.backLink}>{t("surveys.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{activeSurvey.title}</Text>
        {activeSurvey.questions.map((q) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionText}>{q.questionText}</Text>
            {q.type === "SINGLE_CHOICE" && q.options ? (
              q.options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, answers[q.id] === opt ? styles.optionSelected : null]}
                  onPress={() => setAnswers({ ...answers, [q.id]: opt })}
                >
                  <Text>{opt}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <TextInput
                style={styles.input}
                value={answers[q.id] ?? ""}
                onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
              />
            )}
          </View>
        ))}
        <TouchableOpacity onPress={submit} disabled={submitting}>
          <Text style={styles.submitLink}>{submitting ? t("surveys.submitting") : t("surveys.submit")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={surveys}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setActiveSurvey(item)}>
            <Text>
              {item.isPoll ? `${t("surveys.pollTag")} ` : ""}
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("surveys.none")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backLink: { color: "#4F46E5", fontWeight: "600", marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
  questionBlock: { marginBottom: 16 },
  questionText: { fontWeight: "600", marginBottom: 6 },
  option: { padding: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, marginBottom: 6 },
  optionSelected: { borderColor: "#4F46E5", backgroundColor: "#EEF2FF" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 8 },
  submitLink: { color: "#4F46E5", fontWeight: "700", marginTop: 8 },
});
