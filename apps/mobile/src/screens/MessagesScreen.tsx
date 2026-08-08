import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { listMyThreads, listThread, sendMessage, type MessageItem } from "../lib/api-client";

/**
 * Unit 49 — async (REST-polled, no websocket) parent-teacher chat, shared
 * between TeacherHomeScreen and ParentStudentHomeScreen. `own` identifies
 * which side of the conversation the caller is; the other party's id is
 * typed in (no picker UI exists anywhere in this app yet, same convention
 * as every plain-text-ID field on the web admin side).
 */
export function MessagesScreen({
  accessToken,
  branchId,
  own,
}: {
  accessToken: string;
  branchId: string;
  own: { role: "staff" | "guardian"; id: string };
}) {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherId, setOtherId] = useState("");
  const [activeOtherId, setActiveOtherId] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      setThreads(await listMyThreads(accessToken));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const staffId = own.role === "staff" ? own.id : activeOtherId;
  const guardianId = own.role === "guardian" ? own.id : activeOtherId;

  const loadThread = useCallback(async () => {
    if (!staffId || !guardianId) return;
    setThread(await listThread(accessToken, staffId, guardianId));
  }, [accessToken, staffId, guardianId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const send = useCallback(async () => {
    if (!staffId || !guardianId || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage(accessToken, { branchId, staffId, guardianId, body: draft.trim() });
      setDraft("");
      await loadThread();
      await loadThreads();
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSending(false);
    }
  }, [accessToken, branchId, staffId, guardianId, draft, loadThread, loadThreads, t]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (activeOtherId) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setActiveOtherId(null)}>
          <Text style={styles.backLink}>{t("messages.back")}</Text>
        </TouchableOpacity>
        <FlatList
          data={thread}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.senderId === own.id ? styles.bubbleSelf : styles.bubbleOther]}>
              <Text>{item.body}</Text>
            </View>
          )}
        />
        <View style={styles.sendRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t("messages.placeholder") as string}
          />
          <TouchableOpacity onPress={send} disabled={sending || !draft.trim()}>
            <Text style={styles.sendLink}>{sending ? t("messages.sending") : t("messages.send")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.newRow}>
        <TextInput
          style={styles.input}
          value={otherId}
          onChangeText={setOtherId}
          placeholder={t(own.role === "staff" ? "messages.guardianIdPlaceholder" : "messages.staffIdPlaceholder") as string}
        />
        <TouchableOpacity onPress={() => otherId.trim() && setActiveOtherId(otherId.trim())} disabled={!otherId.trim()}>
          <Text style={styles.sendLink}>{t("messages.open")}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={threads}
        keyExtractor={(item) => `${item.staffId}:${item.guardianId}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.threadRow}
            onPress={() => setActiveOtherId(own.role === "staff" ? item.guardianId : item.staffId)}
          >
            <Text numberOfLines={1}>{item.body}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("messages.noThreads")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  newRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 8 },
  sendLink: { color: "#4F46E5", fontWeight: "600" },
  threadRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  empty: { color: "#6B7280", paddingVertical: 12 },
  backLink: { color: "#4F46E5", fontWeight: "600", marginBottom: 8 },
  bubble: { padding: 8, borderRadius: 8, marginVertical: 4, maxWidth: "80%" },
  bubbleSelf: { backgroundColor: "#DCFCE7", alignSelf: "flex-end" },
  bubbleOther: { backgroundColor: "#F3F4F6", alignSelf: "flex-start" },
  sendRow: { flexDirection: "row", gap: 8, alignItems: "center" },
});
