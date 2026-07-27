import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth-context";
import {
  getMyAnnouncements,
  getMyAttendance,
  getMyFeeLedger,
  getMyHomework,
  getMyReportCards,
  getMyTimetable,
  initiateOnlinePayment,
  listMyStudents,
  type MyAnnouncement,
  type MyAttendanceRecord,
  type MyFeeLedgerEntry,
  type MyHomeworkItem,
  type MyReportCard,
  type MyStudent,
  type MyTimetablePeriod,
} from "../lib/api-client";

type Section = "fees" | "attendance" | "reportCards" | "notices" | "homework" | "timetable";

const SECTIONS: Section[] = ["fees", "attendance", "reportCards", "notices", "homework", "timetable"];

/**
 * Unit 24 built the self-scope layer with a minimal proof screen; Unit 25
 * fills it out into the real Parent App — fees + pay, attendance, results,
 * notices, homework, timetable — behind the same multi-child switcher.
 */
export function ParentStudentHomeScreen() {
  const { t } = useTranslation();
  const { session, logout } = useAuth();
  const [students, setStudents] = useState<MyStudent[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("fees");
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<MyFeeLedgerEntry[]>([]);
  const [attendance, setAttendance] = useState<MyAttendanceRecord[]>([]);
  const [reportCards, setReportCards] = useState<MyReportCard[]>([]);
  const [announcements, setAnnouncements] = useState<MyAnnouncement[]>([]);
  const [homework, setHomework] = useState<MyHomeworkItem[]>([]);
  const [timetable, setTimetable] = useState<MyTimetablePeriod[]>([]);

  useEffect(() => {
    if (!session) return;
    listMyStudents(session.accessToken)
      .then((items) => {
        setStudents(items);
        setActiveStudentId(items[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const loadSection = useCallback(async () => {
    if (!session || !activeStudentId) return;
    const now = new Date();
    if (section === "fees") {
      setLedger(await getMyFeeLedger(session.accessToken, activeStudentId));
    } else if (section === "attendance") {
      setAttendance(await getMyAttendance(session.accessToken, activeStudentId, now.getMonth() + 1, now.getFullYear()));
    } else if (section === "reportCards") {
      setReportCards(await getMyReportCards(session.accessToken, activeStudentId));
    } else if (section === "notices") {
      setAnnouncements(await getMyAnnouncements(session.accessToken, activeStudentId));
    } else if (section === "homework") {
      setHomework(await getMyHomework(session.accessToken, activeStudentId));
    } else {
      setTimetable(await getMyTimetable(session.accessToken, activeStudentId));
    }
  }, [session, activeStudentId, section]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const activeStudent = students.find((s) => s.id === activeStudentId);

  const payDue = useCallback(
    async (entry: MyFeeLedgerEntry) => {
      if (!session || !activeStudent || !entry.invoiceId) return;
      try {
        // context/feature-specs/25's Open Question 2 — the backend's own
        // Razorpay order creation is still a stub (Unit 13), so this proves
        // the initiate round trip only, not a real completed payment. A real
        // Checkout SDK/WebView screen is deferred until that stub is real.
        const order = await initiateOnlinePayment(session.accessToken, {
          branchId: activeStudent.branchId,
          studentId: activeStudent.id,
          invoiceId: entry.invoiceId,
          amount: entry.amount,
          mode: "UPI",
        });
        Alert.alert(t("me.fees.orderCreatedTitle"), `${t("me.fees.orderCreatedBody")} ${order.gatewayOrderId}`);
      } catch (err) {
        Alert.alert(t("attendance.errorTitle"), (err as Error).message);
      }
    },
    [session, activeStudent, t]
  );

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
        <Text style={styles.title}>{t("home.parent")}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutLink}>{t("home.logout")}</Text>
        </TouchableOpacity>
      </View>

      {students.length > 1 ? (
        <View style={styles.childRow}>
          {students.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childChip, child.id === activeStudentId ? styles.childChipActive : null]}
              onPress={() => setActiveStudentId(child.id)}
            >
              <Text>{child.firstName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.tabRow}>
        {SECTIONS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, tab === section ? styles.tabActive : null]}
            onPress={() => setSection(tab)}
          >
            <Text>{t(`me.tabs.${tab}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === "fees" ? (
        <FlatList
          data={ledger}
          keyExtractor={(item, index) => item.invoiceId ?? `${item.type}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.feeRow}>
              <Text>
                {item.type === "invoice" ? item.periodLabel : t("me.fees.payment")} — ₹
                {(item.amount / 100).toFixed(2)}
              </Text>
              {item.type === "invoice" && item.status !== "PAID" ? (
                <TouchableOpacity onPress={() => payDue(item)}>
                  <Text style={styles.payNow}>{t("me.fees.payNow")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      ) : null}
      {section === "attendance" ? (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.row2}>
              {item.date.slice(0, 10)} — {item.status}
            </Text>
          )}
        />
      ) : null}
      {section === "reportCards" ? (
        <FlatList
          data={reportCards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Text style={styles.row2}>{item.examId}</Text>}
        />
      ) : null}
      {section === "notices" ? (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row2}>
              <Text style={styles.noticeTitle}>{item.title}</Text>
              <Text>{item.body}</Text>
            </View>
          )}
        />
      ) : null}
      {section === "homework" ? (
        <FlatList
          data={homework}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.row2}>
              {item.title} — {t("me.due")} {item.dueDate.slice(0, 10)}
            </Text>
          )}
        />
      ) : null}
      {section === "timetable" ? (
        <FlatList
          data={timetable}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.row2}>
              {t("me.day")} {item.dayOfWeek} — {t("me.period")} {item.periodNo}
            </Text>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "600" },
  logoutLink: { color: "#4F46E5", fontWeight: "600" },
  childRow: { flexDirection: "row", gap: 8 },
  childChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#E5E7EB" },
  childChipActive: { backgroundColor: "#4F46E5" },
  tabRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: "#DCFCE7" },
  row2: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  payNow: { color: "#4F46E5", fontWeight: "600" },
  noticeTitle: { fontWeight: "600" },
});
