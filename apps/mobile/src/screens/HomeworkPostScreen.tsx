import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { useAuth } from "../lib/auth-context";
import { SectionPicker } from "../components/SectionPicker";
import { listMyTeacherAssignments, postHomework, type MyTeacherAssignment } from "../lib/api-client";
import { colors } from "../theme";

/** DD/MM/YYYY per ui-context.md's stated date convention — same helper as FeesScreen/AttendanceScreen. */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function HomeworkPostScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [assignments, setAssignments] = useState<MyTeacherAssignment[]>([]);
  const [active, setActive] = useState<MyTeacherAssignment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!session) return;
    listMyTeacherAssignments(session.accessToken).then((items) => {
      setAssignments(items);
      setActive((prev) => prev ?? items[0] ?? null);
    });
  }, [session]);

  const onChangeDueDate = useCallback((event: DateTimePickerEvent, selected?: Date) => {
    // Android's picker is an imperative dialog that dismisses itself after
    // one choice; iOS's stays mounted (inline/spinner) until closed some
    // other way — same platform split the RN community docs recommend.
    setShowPicker(Platform.OS === "ios");
    if (event.type === "set" && selected) {
      setDueDate(selected);
    }
  }, []);

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
        dueDate: dueDate.toISOString(),
      });
      setTitle("");
      setDescription("");
      setDueDate(null);
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

      <TextInput
        style={styles.input}
        placeholder={t("homework.titlePlaceholder") as string}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t("homework.descriptionPlaceholder") as string}
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker(true)} accessibilityRole="button">
        <CalendarDays size={18} color={dueDate ? colors.brand : colors.textMuted} />
        <Text style={[styles.dateFieldText, dueDate ? styles.dateFieldTextSet : null]}>
          {dueDate ? formatDate(dueDate) : t("homework.dueDatePlaceholder")}
        </Text>
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker value={dueDate ?? new Date()} mode="date" minimumDate={new Date()} onChange={onChangeDueDate} />
      ) : null}

      <TouchableOpacity style={styles.postButton} onPress={post} disabled={posting}>
        {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>{t("homework.post")}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", color: colors.textPrimary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, color: colors.textPrimary, backgroundColor: colors.bgSurface },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.bgSurface,
  },
  dateFieldText: { fontSize: 15, color: colors.textMuted },
  dateFieldTextSet: { color: colors.textPrimary, fontWeight: "600" },
  postButton: { backgroundColor: colors.brand, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  postButtonText: { color: "#fff", fontWeight: "600" },
});
