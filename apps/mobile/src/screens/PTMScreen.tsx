import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { bookPTMSlot, getMyTeachers, listPTMSlots, type MyTeacherItem, type PTMSlotItem } from "../lib/api-client";

/** Unit 52 — surfaces Unit 49's existing `PTMSlot` booking endpoint on the parent app (staff-only web UI until now). */
export function PTMScreen({ accessToken, studentId }: { accessToken: string; studentId: string }) {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<MyTeacherItem[]>([]);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [slots, setSlots] = useState<PTMSlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyTeachers(accessToken, studentId)
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, [accessToken, studentId]);

  const loadSlots = useCallback(
    async (staffId: string) => {
      setLoading(true);
      try {
        setSlots(await listPTMSlots(accessToken, staffId));
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (activeStaffId) void loadSlots(activeStaffId);
  }, [activeStaffId, loadSlots]);

  const book = useCallback(
    async (slotId: string) => {
      setBooking(slotId);
      try {
        await bookPTMSlot(accessToken, slotId);
        if (activeStaffId) await loadSlots(activeStaffId);
      } catch (err) {
        Alert.alert(t("attendance.errorTitle"), (err as Error).message);
      } finally {
        setBooking(null);
      }
    },
    [accessToken, activeStaffId, loadSlots, t]
  );

  if (loading && !activeStaffId) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (activeStaffId) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setActiveStaffId(null)}>
          <Text style={styles.backLink}>{t("ptm.back")}</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={slots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text>
                  {new Date(item.startTime).toLocaleString()} – {new Date(item.endTime).toLocaleTimeString()}
                </Text>
                {item.bookedByGuardianId ? (
                  <Text style={styles.booked}>{t("ptm.booked")}</Text>
                ) : (
                  <TouchableOpacity onPress={() => book(item.id)} disabled={booking === item.id}>
                    <Text style={styles.bookLink}>{booking === item.id ? t("ptm.booking") : t("ptm.book")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t("ptm.noSlots")}</Text>}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={teachers}
        keyExtractor={(item) => item.staffId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setActiveStaffId(item.staffId)}>
            <Text>
              {item.staffName} · {item.subjectName}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t("ptm.noTeachers")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backLink: { color: "#4F46E5", fontWeight: "600", marginBottom: 8 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  booked: { color: "#6B7280", fontSize: 12 },
  bookLink: { color: "#4F46E5", fontWeight: "600" },
  empty: { color: "#6B7280", paddingVertical: 12 },
});
