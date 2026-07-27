import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import { listMyTeacherAssignments, postHomework, type MyTeacherAssignment } from "../lib/api-client";

export function HomeworkPostScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => {
      setAssignments(items);
      setActive((prev) => prev ?? items[0] ?? null);
    });
  }, [session]);

  const post = useCallback(async () => {
    if (!session || !active || !title || !description || !dueDate) return;
    setPosting(true);
    try {
      await postHomework(session.accessToken, {
        branchId: active.section.branchId,
        sectionId: active.sectionId,
        subjectId: active.subjectId,
        title,
        description,
        dueDate,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      Alert.alert(t("homework.postedTitle"));
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setPosting(false);
    }
  }, [session, active, title, description, dueDate, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("homework.title")}</Text>
      <SectionPicker assignments={assignments} activeAssignmentId={active?.id ?? null} onSelect={setActive} />

      <TextInput style={styles.input} placeholder={t("homework.titlePlaceholder") as string} value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t("homework.descriptionPlaceholder") as string}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder={t("homework.dueDatePlaceholder") as string}
        value={dueDate}
        onChangeText={setDueDate}
      />

      <TouchableOpacity style={styles.postButton} onPress={post} disabled={posting}>
        {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>{t("homework.post")}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 10 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  postButton: { backgroundColor: "#4F46E5", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  postButtonText: { color: "#fff", fontWeight: "600" },
});
