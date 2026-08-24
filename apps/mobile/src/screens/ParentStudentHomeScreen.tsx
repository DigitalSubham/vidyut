import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../lib/auth-context";
import { OnlineExamTaker } from "./OnlineExamTaker";
import { MessagesScreen } from "./MessagesScreen";
import { PTMScreen } from "./PTMScreen";
import { SurveysScreen } from "./SurveysScreen";
import { GalleryScreen } from "./GalleryScreen";
import { TransportScreen } from "./TransportScreen";
import { LibraryScreen } from "./LibraryScreen";
import { StoreScreen } from "./StoreScreen";
import { TimelineScreen } from "./TimelineScreen";
import { LmsScreen } from "./LmsScreen";
import { CommunicationPreferencesScreen } from "./CommunicationPreferencesScreen";
import {
  ackCircular,
  createComplaint,
  getMyAnnouncements,
  getMyAttendance,
  getMyCalendar,
  getMyCirculars,
  getMyFeeLedger,
  getMyGuardian,
  getMyHomework,
  getMyReportCards,
  getMyTimetable,
  initiateOnlinePayment,
  listMyComplaints,
  listMyOnlineExams,
  listMyStudents,
  requestHomeworkSubmissionUpload,
  type MyAnnouncement,
  type MyAttendanceRecord,
  type MyCalendarItem,
  type MyCircular,
  type MyComplaint,
  type MyFeeLedgerEntry,
  type MyHomeworkItem,
  type MyOnlineExamListItem,
  type MyReportCard,
  type MyStudent,
  type MyTimetablePeriod,
} from "../lib/api-client";

type Section =
  | "fees"
  | "attendance"
  | "reportCards"
  | "notices"
  | "homework"
  | "timetable"
  | "calendar"
  | "onlineExams"
  | "circulars"
  | "complaints"
  | "messages"
  | "ptm"
  | "surveys"
  | "gallery"
  | "transport"
  | "library"
  | "store"
  | "timeline"
  | "lms"
  | "settings";

const SECTIONS: Section[] = [
  "fees",
  "attendance",
  "reportCards",
  "notices",
  "homework",
  "timetable",
  "calendar",
  "onlineExams",
  "circulars",
  "complaints",
  "messages",
  "ptm",
  "surveys",
  "gallery",
  "transport",
  "library",
  "store",
  "timeline",
  "lms",
  "settings",
];

/**
 * Unit 24 built the self-scope layer with a minimal proof screen; Unit 25
 * fills it out into the real Parent App — fees + pay, attendance, results,
 * notices, homework, timetable — behind the same multi-child switcher.
 * Unit 45 adds homework submission + a calendar view; Unit 46 adds MCQ
 * online-exam taking.
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
  const [calendar, setCalendar] = useState<MyCalendarItem[]>([]);
  const [onlineExams, setOnlineExams] = useState<MyOnlineExamListItem[]>([]);
  const [submittingHomeworkId, setSubmittingHomeworkId] = useState<string | null>(null);
  const [submittedHomeworkIds, setSubmittedHomeworkIds] = useState<Set<string>>(new Set());
  const [takingExamId, setTakingExamId] = useState<string | null>(null);
  const [circulars, setCirculars] = useState<MyCircular[]>([]);
  const [complaints, setComplaints] = useState<MyComplaint[]>([]);
  const [complaintCategory, setComplaintCategory] = useState("");
  const [complaintBody, setComplaintBody] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [guardianId, setGuardianId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyStudents(session.accessToken)
      .then((items) => {
        setStudents(items);
        setActiveStudentId(items[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
    // A STUDENT-direct-login token has no linked Guardian — the Messages tab
    // simply stays unusable for them (chat is parent-teacher only, per spec).
    getMyGuardian(session.accessToken)
      .then((g) => setGuardianId(g.id))
      .catch(() => setGuardianId(null));
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
    } else if (section === "timetable") {
      setTimetable(await getMyTimetable(session.accessToken, activeStudentId));
    } else if (section === "calendar") {
      setCalendar(await getMyCalendar(session.accessToken, activeStudentId, now.getMonth() + 1, now.getFullYear()));
    } else if (section === "onlineExams") {
      setOnlineExams(await listMyOnlineExams(session.accessToken, activeStudentId));
    } else if (section === "circulars") {
      setCirculars(await getMyCirculars(session.accessToken, activeStudentId));
    } else if (section === "complaints") {
      setComplaints(await listMyComplaints(session.accessToken));
    }
  }, [session, activeStudentId, section]);

  const activeStudent = students.find((s) => s.id === activeStudentId);

  const ackAndRefresh = useCallback(
    async (circularId: string) => {
      if (!session) return;
      await ackCircular(session.accessToken, circularId);
      setCirculars((prev) => prev.map((c) => (c.id === circularId ? { ...c, acked: true } : c)));
    },
    [session]
  );

  const raiseComplaint = useCallback(async () => {
    if (!session || !activeStudent || !complaintCategory.trim() || !complaintBody.trim()) return;
    setSubmittingComplaint(true);
    try {
      await createComplaint(session.accessToken, {
        branchId: activeStudent.branchId,
        category: complaintCategory.trim(),
        body: complaintBody.trim(),
      });
      setComplaintCategory("");
      setComplaintBody("");
      setComplaints(await listMyComplaints(session.accessToken));
    } catch (err) {
      Alert.alert(t("attendance.errorTitle"), (err as Error).message);
    } finally {
      setSubmittingComplaint(false);
    }
  }, [session, activeStudent, complaintCategory, complaintBody, t]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

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

  const submitHomework = useCallback(
    async (homeworkId: string) => {
      if (!session || !activeStudentId) return;
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];

      setSubmittingHomeworkId(homeworkId);
      try {
        const { uploadUrl } = await requestHomeworkSubmissionUpload(session.accessToken, homeworkId, {
          studentId: activeStudentId,
          fileName: file.name,
          contentType: file.mimeType ?? "application/octet-stream",
        });
        const fileData = await fetch(file.uri);
        const blob = await fileData.blob();
        await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.mimeType ?? "application/octet-stream" }, body: blob });
        setSubmittedHomeworkIds((prev) => new Set(prev).add(homeworkId));
        Alert.alert(t("me.homeworkSubmittedTitle"));
      } catch (err) {
        Alert.alert(t("attendance.errorTitle"), (err as Error).message);
      } finally {
        setSubmittingHomeworkId(null);
      }
    },
    [session, activeStudentId, t]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (takingExamId && session && activeStudentId) {
    return (
      <OnlineExamTaker
        accessToken={session.accessToken}
        examId={takingExamId}
        studentId={activeStudentId}
        onDone={(result) => {
          setTakingExamId(null);
          if (result) {
            setOnlineExams((prev) =>
              prev.map((e) => (e.id === takingExamId ? { ...e, submitted: true, score: result.score, maxScore: result.maxScore } : e))
            );
          }
        }}
      />
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
              {item.type === "payment" && item.receiptDownloadUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.receiptDownloadUrl!)}>
                  <Text style={styles.payNow}>{t("me.fees.downloadReceipt")}</Text>
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
          renderItem={({ item }) => (
            <View style={styles.feeRow}>
              <Text style={styles.row2}>{item.examId}</Text>
              {item.downloadUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.downloadUrl!)}>
                  <Text style={styles.payNow}>{t("me.reportCards.downloadPdf")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
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
            <View style={styles.homeworkRow}>
              <Text>
                {item.title} — {t("me.due")} {item.dueDate.slice(0, 10)}
              </Text>
              <TouchableOpacity
                onPress={() => submitHomework(item.id)}
                disabled={submittingHomeworkId === item.id}
              >
                <Text style={styles.submitLink}>
                  {submittingHomeworkId === item.id
                    ? t("me.submitting")
                    : submittedHomeworkIds.has(item.id)
                      ? t("me.submitted")
                      : t("me.submit")}
                </Text>
              </TouchableOpacity>
            </View>
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
      {section === "calendar" ? (
        <FlatList
          data={calendar}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row2}>
              <Text style={styles.noticeTitle}>
                {item.date.slice(0, 10)} · {t(`me.calendarType.${item.type}`)}
              </Text>
              <Text>{item.title}</Text>
            </View>
          )}
        />
      ) : null}
      {section === "circulars" ? (
        <FlatList
          data={circulars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.homeworkRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>{item.title}</Text>
                <Text>{item.body}</Text>
              </View>
              {item.acked ? (
                <Text style={styles.scoreText}>{t("me.acked")}</Text>
              ) : (
                <TouchableOpacity onPress={() => ackAndRefresh(item.id)}>
                  <Text style={styles.submitLink}>{t("me.ack")}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      ) : null}
      {section === "complaints" ? (
        <View style={{ flex: 1, gap: 8 }}>
          <TextInput
            style={styles.textInput}
            placeholder={t("me.complaintCategory") as string}
            value={complaintCategory}
            onChangeText={setComplaintCategory}
          />
          <TextInput
            style={styles.textInput}
            placeholder={t("me.complaintBody") as string}
            value={complaintBody}
            onChangeText={setComplaintBody}
          />
          <TouchableOpacity
            onPress={raiseComplaint}
            disabled={submittingComplaint || !complaintCategory.trim() || !complaintBody.trim()}
          >
            <Text style={styles.submitLink}>{submittingComplaint ? t("me.submitting") : t("me.raiseComplaint")}</Text>
          </TouchableOpacity>
          <FlatList
            data={complaints}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row2}>
                <Text style={styles.noticeTitle}>
                  {item.category} — {item.status}
                </Text>
                <Text>{item.body}</Text>
                {item.resolution ? <Text>{t("me.resolution")}: {item.resolution}</Text> : null}
              </View>
            )}
          />
        </View>
      ) : null}
      {section === "messages" ? (
        session && guardianId && activeStudent ? (
          <MessagesScreen accessToken={session.accessToken} branchId={activeStudent.branchId} own={{ role: "guardian", id: guardianId }} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "ptm" ? (
        session && activeStudentId ? (
          <PTMScreen accessToken={session.accessToken} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "surveys" ? (
        session && activeStudent ? (
          <SurveysScreen accessToken={session.accessToken} branchId={activeStudent.branchId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "gallery" ? (
        session && activeStudent ? (
          <GalleryScreen accessToken={session.accessToken} branchId={activeStudent.branchId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "transport" ? (
        session && activeStudentId ? (
          <TransportScreen accessToken={session.accessToken} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "library" ? (
        session && activeStudentId ? (
          <LibraryScreen accessToken={session.accessToken} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "store" ? (
        session && activeStudent && activeStudentId ? (
          <StoreScreen accessToken={session.accessToken} branchId={activeStudent.branchId} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "timeline" ? (
        session && activeStudentId ? (
          <TimelineScreen accessToken={session.accessToken} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "lms" ? (
        session && activeStudentId ? (
          <LmsScreen accessToken={session.accessToken} studentId={activeStudentId} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "settings" ? (
        session ? (
          <CommunicationPreferencesScreen accessToken={session.accessToken} />
        ) : (
          <Text style={styles.row2}>{t("me.messagesUnavailable")}</Text>
        )
      ) : null}
      {section === "onlineExams" ? (
        <FlatList
          data={onlineExams}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.homeworkRow}>
              <Text>
                {item.title} ({item.durationMinutes} {t("onlineExams.minutes")})
              </Text>
              {item.submitted ? (
                <Text style={styles.scoreText}>
                  {t("onlineExams.score")}: {item.score}/{item.maxScore}
                </Text>
              ) : (
                <TouchableOpacity onPress={() => setTakingExamId(item.id)}>
                  <Text style={styles.submitLink}>{t("onlineExams.take")}</Text>
                </TouchableOpacity>
              )}
            </View>
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
  textInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 8 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  homeworkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  payNow: { color: "#4F46E5", fontWeight: "600" },
  submitLink: { color: "#4F46E5", fontWeight: "600" },
  scoreText: { color: "#166534", fontWeight: "600" },
  noticeTitle: { fontWeight: "600" },
});
