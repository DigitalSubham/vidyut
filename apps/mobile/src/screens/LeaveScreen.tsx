import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { applyLeave, listMyLeaveRequests, type LeaveRequestItem } from "../lib/api-client";

const LEAVE_TYPES: LeaveRequestItem["type"][] = ["CASUAL", "SICK", "EARNED", "OTHER"];

/** Unit 52 — surfaces Unit 09's existing self-scoped `POST /leave-requests` on the teacher app (backend-only until now). */
export function LeaveScreen({ accessToken, staffId }: { accessToken: string; staffId: string }) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<LeaveRequestItem["type"]>("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await listMyLeaveRequests(accessToken, staffId));
    } finally {
      setLoading(false);
    }
  }, [accessToken, staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(async () => {
    if (!fromDate.trim() || !toDate.trim()) return;
    setApplying(true);
    try {
      await applyLeave(accessToken, staffId, { type, fromDate: fromDate.trim(), toDate: toDate.trim() });
      setFromDate("");
      setToDate("");
      await load();
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setApplying(false);
    }
  }, [accessToken, staffId, type, fromDate, toDate, load, t]);

  return (
    <View style={styles.container}>
      <View style={styles.typeRow}>
        {LEAVE_TYPES.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.typePill, type === option ? styles.typePillActive : null]}
            onPress={() => setType(option)}
          >
            <Text>{t(`leave.types.${option}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder={t("leave.fromDate") as string} />
      <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder={t("leave.toDate") as string} />
      <TouchableOpacity onPress={apply} disabled={applying || !fromDate.trim() || !toDate.trim()}>
        <Text style={styles.applyLink}>{applying ? t("leave.applying") : t("leave.apply")}</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text>{t(`leave.types.${item.type}`)} · {item.fromDate.slice(0, 10)} → {item.toDate.slice(0, 10)}</Text>
              <Text style={styles.status}>{t(`leave.status.${item.status}`)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t("leave.noRequests")}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#F3F4F6" },
  typePillActive: { backgroundColor: "#DCFCE7" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 8 },
  applyLink: { color: "#4F46E5", fontWeight: "600", paddingVertical: 6 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  status: { color: "#6B7280", fontSize: 12 },
  empty: { color: "#6B7280", paddingVertical: 12 },
});
