"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId } from "@/lib/admin-client";

const EXAM_TYPES = ["UNIT_TEST", "HALF_YEARLY", "ANNUAL", "PRE_BOARD", "PRACTICAL"];
const GRADING_SCHEMES = ["MARKS", "PERCENTAGE", "GRADE", "CCE", "CGPA"];

function ExamManageSection({ examId }: { examId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Subjects
  const [subjClassId, setSubjClassId] = useState("");
  const [subjSubjectId, setSubjSubjectId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [passMarks, setPassMarks] = useState("33");
  const subjectsQuery = useQuery({
    queryKey: ["exam-subjects", examId],
    queryFn: () => adminApi.listExamSubjects(examId),
  });
  const createSubjectMutation = useMutation({
    mutationFn: () =>
      adminApi.createExamSubject(examId, {
        classId: subjClassId,
        subjectId: subjSubjectId,
        maxMarks: Number(maxMarks),
        passMarks: Number(passMarks),
      }),
    onSuccess: () => {
      setSubjClassId("");
      setSubjSubjectId("");
      void queryClient.invalidateQueries({ queryKey: ["exam-subjects", examId] });
    },
  });

  // Timetable
  const [ttSubjectId, setTtSubjectId] = useState("");
  const [ttDate, setTtDate] = useState("");
  const [ttStartTime, setTtStartTime] = useState("");
  const [ttRoom, setTtRoom] = useState("");
  const timetableQuery = useQuery({
    queryKey: ["exam-timetable", examId],
    queryFn: () => adminApi.listExamTimetable(examId),
  });
  const createTimetableMutation = useMutation({
    mutationFn: () =>
      adminApi.createExamTimetable(examId, { subjectId: ttSubjectId, date: ttDate, startTime: ttStartTime, room: ttRoom || undefined }),
    onSuccess: () => {
      setTtSubjectId("");
      setTtDate("");
      setTtStartTime("");
      setTtRoom("");
      void queryClient.invalidateQueries({ queryKey: ["exam-timetable", examId] });
    },
  });

  // Co-scholastic
  const [csStudentId, setCsStudentId] = useState("");
  const [csActivity, setCsActivity] = useState("");
  const [csGrade, setCsGrade] = useState("");
  const coScholasticQuery = useQuery({
    queryKey: ["co-scholastic", examId],
    queryFn: () => adminApi.listCoScholasticGrades(examId),
  });
  const saveCoScholasticMutation = useMutation({
    mutationFn: () =>
      adminApi.bulkEnterCoScholasticGrades(examId, [{ studentId: csStudentId, activity: csActivity, grade: csGrade }]),
    onSuccess: () => {
      setCsStudentId("");
      setCsActivity("");
      setCsGrade("");
      void queryClient.invalidateQueries({ queryKey: ["co-scholastic", examId] });
    },
  });

  // Rank
  const rankQuery = useQuery({
    queryKey: ["exam-rank", examId],
    queryFn: () => adminApi.getExamRank(examId),
  });

  return (
    <Tabs defaultValue="subjects" className="mt-4">
      <TabsList>
        <TabsTrigger value="subjects">{t("school.exams.subjectsTab")}</TabsTrigger>
        <TabsTrigger value="timetable">{t("school.exams.timetableTab")}</TabsTrigger>
        <TabsTrigger value="coScholastic">{t("school.exams.coScholasticTab")}</TabsTrigger>
        <TabsTrigger value="rank">{t("school.exams.rankTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="subjects">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.classId")}</Label>
              <Input className="max-w-xs" value={subjClassId} onChange={(e) => setSubjClassId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.subjectId")}</Label>
              <Input className="max-w-xs" value={subjSubjectId} onChange={(e) => setSubjSubjectId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.maxMarks")}</Label>
              <Input className="max-w-24" type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.passMarks")}</Label>
              <Input className="max-w-24" type="number" value={passMarks} onChange={(e) => setPassMarks(e.target.value)} />
            </div>
            <Button onClick={() => createSubjectMutation.mutate()} disabled={!subjClassId || !subjSubjectId}>
              {t("school.common.save")}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.exams.subjectId")}</TableHead>
                <TableHead>{t("school.exams.maxMarks")}</TableHead>
                <TableHead>{t("school.exams.passMarks")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subjectsQuery.data?.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.subjectId}</TableCell>
                  <TableCell>{s.maxMarks}</TableCell>
                  <TableCell>{s.passMarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="timetable">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.subjectId")}</Label>
              <Input className="max-w-xs" value={ttSubjectId} onChange={(e) => setTtSubjectId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.date")}</Label>
              <Input type="date" value={ttDate} onChange={(e) => setTtDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.startTime")}</Label>
              <Input placeholder="10:00" value={ttStartTime} onChange={(e) => setTtStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.room")}</Label>
              <Input className="max-w-xs" value={ttRoom} onChange={(e) => setTtRoom(e.target.value)} />
            </div>
            <Button onClick={() => createTimetableMutation.mutate()} disabled={!ttSubjectId || !ttDate || !ttStartTime}>
              {t("school.common.save")}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.exams.subjectId")}</TableHead>
                <TableHead>{t("school.exams.date")}</TableHead>
                <TableHead>{t("school.exams.startTime")}</TableHead>
                <TableHead>{t("school.exams.room")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(timetableQuery.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.subjectId}</TableCell>
                  <TableCell>{row.date.slice(0, 10)}</TableCell>
                  <TableCell>{row.startTime}</TableCell>
                  <TableCell>{row.room ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="coScholastic">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.studentId")}</Label>
              <Input className="max-w-xs" value={csStudentId} onChange={(e) => setCsStudentId(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.activity")}</Label>
              <Input value={csActivity} onChange={(e) => setCsActivity(e.target.value)} placeholder="Discipline" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.exams.grade")}</Label>
              <Input className="max-w-24" value={csGrade} onChange={(e) => setCsGrade(e.target.value)} placeholder="A1" />
            </div>
            <Button onClick={() => saveCoScholasticMutation.mutate()} disabled={!csStudentId || !csActivity || !csGrade}>
              {t("school.common.save")}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("school.exams.studentId")}</TableHead>
                <TableHead>{t("school.exams.activity")}</TableHead>
                <TableHead>{t("school.exams.grade")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(coScholasticQuery.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.studentId}</TableCell>
                  <TableCell>{row.activity}</TableCell>
                  <TableCell>
                    <Badge>{row.grade}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="rank">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.exams.rank")}</TableHead>
              <TableHead>{t("school.students.name")}</TableHead>
              <TableHead>{t("school.exams.obtainedMarks")}</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rankQuery.data?.data ?? []).map((row) => (
              <TableRow key={row.studentId}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>
                  {row.firstName} {row.lastName}
                </TableCell>
                <TableCell>
                  {row.obtainedMarks}/{row.maxMarks}
                </TableCell>
                <TableCell>{row.percent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}

function ExamsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(EXAM_TYPES[0]);
  const [gradingScheme, setGradingScheme] = useState(GRADING_SCHEMES[0]);
  const [managedExamId, setManagedExamId] = useState("");

  const examsQuery = useQuery({
    queryKey: ["exams", branchId],
    queryFn: () => adminApi.listExams(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createExam({ branchId, sessionId, name, type, gradingScheme }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["exams", branchId] });
      toast.success(t("school.exams.examCreated") as string);
    },
  });

  const exams = examsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.sessionId")}</Label>
          <Input className="max-w-xs" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.examName")}</Label>
          <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.examType")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXAM_TYPES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.gradingScheme")}</Label>
          <Select value={gradingScheme} onValueChange={setGradingScheme}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADING_SCHEMES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!sessionId || !name}>
          {t("school.exams.createExam")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.exams.examName")}</TableHead>
            <TableHead>{t("school.exams.examType")}</TableHead>
            <TableHead>{t("school.exams.gradingScheme")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => (
            <TableRow key={exam.id}>
              <TableCell>{exam.name}</TableCell>
              <TableCell>{exam.type}</TableCell>
              <TableCell>{exam.gradingScheme}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setManagedExamId(exam.id)}>
                  {t("school.exams.manage")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {managedExamId ? <ExamManageSection examId={managedExamId} /> : null}
    </div>
  );
}

function TranscriptTab() {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState("");
  const [loadedStudentId, setLoadedStudentId] = useState("");

  const transcriptQuery = useQuery({
    queryKey: ["transcript", loadedStudentId],
    queryFn: () => adminApi.getStudentTranscript(loadedStudentId),
    enabled: !!loadedStudentId,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.studentId")}</Label>
          <Input className="max-w-xs" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setLoadedStudentId(studentId)}>
          {t("school.common.load")}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.exams.examId")}</TableHead>
            <TableHead>{t("school.exams.sessionId")}</TableHead>
            <TableHead>{t("school.exams.publishedAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(transcriptQuery.data?.data ?? []).map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">{row.examId}</TableCell>
              <TableCell className="font-mono text-xs">{row.sessionId}</TableCell>
              <TableCell>{row.publishedAt ? row.publishedAt.slice(0, 10) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OnlineExamManageSection({ examId }: { examId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState("0");
  const [marks, setMarks] = useState("1");
  const [bankItemId, setBankItemId] = useState("");
  const [bankMarks, setBankMarks] = useState("1");

  const questionsQuery = useQuery({
    queryKey: ["online-exam-questions", examId],
    queryFn: () => adminApi.listOnlineExamQuestions(examId),
  });
  const submissionsQuery = useQuery({
    queryKey: ["online-exam-submissions", examId],
    queryFn: () => adminApi.listOnlineExamSubmissions(examId),
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishOnlineExam(examId),
    onSuccess: () => {
      toast.success(t("school.exams.onlineExamPublished") as string);
      // Broad invalidation (no branchId in scope here) — the online-exams
      // list is small, refetching it isn't costly.
      void queryClient.invalidateQueries({ queryKey: ["online-exams"] });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: () =>
      adminApi.addOnlineExamQuestion(examId, {
        questionText,
        options: options.split(",").map((o) => o.trim()).filter(Boolean),
        correctOptionIndex: Number(correctOptionIndex),
        marks: Number(marks),
      }),
    onSuccess: () => {
      setQuestionText("");
      setOptions("");
      void queryClient.invalidateQueries({ queryKey: ["online-exam-questions", examId] });
    },
  });

  const addFromBankMutation = useMutation({
    mutationFn: () => adminApi.addOnlineExamQuestionFromBank(examId, bankItemId, Number(bankMarks)),
    onSuccess: () => {
      setBankItemId("");
      void queryClient.invalidateQueries({ queryKey: ["online-exam-questions", examId] });
    },
  });

  return (
    <div className="mt-4 flex flex-col gap-6">
      <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="w-fit">
        {t("school.exams.publish")}
      </Button>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.exams.addQuestion")}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.questionText")}</Label>
            <Input className="min-w-64" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.optionsCsv")}</Label>
            <Input className="min-w-64" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="4, 5, 6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.correctIndex")}</Label>
            <Input className="max-w-20" type="number" value={correctOptionIndex} onChange={(e) => setCorrectOptionIndex(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.marks")}</Label>
            <Input className="max-w-20" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
          </div>
          <Button onClick={() => addQuestionMutation.mutate()} disabled={!questionText || !options}>
            {t("school.common.save")}
          </Button>
        </div>

        <h4 className="mt-2 font-heading text-xs font-semibold text-text-secondary">
          {t("school.exams.addFromBank")}
        </h4>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.questionBankItemId")}</Label>
            <Input className="min-w-64" value={bankItemId} onChange={(e) => setBankItemId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.exams.marks")}</Label>
            <Input className="max-w-20" type="number" value={bankMarks} onChange={(e) => setBankMarks(e.target.value)} />
          </div>
          <Button onClick={() => addFromBankMutation.mutate()} disabled={!bankItemId}>
            {t("school.common.save")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.exams.questionText")}</TableHead>
            <TableHead>{t("school.exams.optionsCsv")}</TableHead>
            <TableHead>{t("school.exams.marks")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(questionsQuery.data?.data ?? []).map((q) => (
            <TableRow key={q.id}>
              <TableCell>{q.questionText}</TableCell>
              <TableCell>{q.options.join(", ")}</TableCell>
              <TableCell>{q.marks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{t("school.exams.submissionsTab")}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("school.exams.studentId")}</TableHead>
              <TableHead>{t("school.exams.score")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(submissionsQuery.data?.data ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.studentId}</TableCell>
                <TableCell>
                  {s.score}/{s.maxScore}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OnlineExamsTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [managedId, setManagedId] = useState("");

  const listQuery = useQuery({
    queryKey: ["online-exams", branchId],
    queryFn: () => adminApi.listOnlineExams(branchId),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createOnlineExam({ branchId, classId, subjectId, title, durationMinutes: Number(durationMinutes) }),
    onSuccess: () => {
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["online-exams", branchId] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.classId")}</Label>
          <Input className="max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.onlineExamTitle")}</Label>
          <Input className="max-w-xs" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.durationMinutes")}</Label>
          <Input className="max-w-24" type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!classId || !subjectId || !title}>
          {t("school.exams.createOnlineExam")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.exams.onlineExamTitle")}</TableHead>
            <TableHead>{t("school.exams.durationMinutes")}</TableHead>
            <TableHead>{t("school.exams.published")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(listQuery.data?.data ?? []).map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.title}</TableCell>
              <TableCell>{e.durationMinutes}</TableCell>
              <TableCell>
                <Badge variant={e.isPublished ? "default" : "secondary"}>{e.isPublished ? "Yes" : "No"}</Badge>
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => setManagedId(e.id)}>
                  {t("school.exams.manage")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {managedId ? <OnlineExamManageSection examId={managedId} /> : null}
    </div>
  );
}

function QuestionBankTab() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState("");
  const [correctOptionIndex, setCorrectOptionIndex] = useState("0");
  const [filterClassId, setFilterClassId] = useState("");

  const listQuery = useQuery({
    queryKey: ["question-bank", branchId, filterClassId],
    queryFn: () => adminApi.listQuestionBankItems(branchId, filterClassId || undefined),
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createQuestionBankItem({
        branchId,
        classId,
        subjectId,
        questionText,
        options: options.split(",").map((o) => o.trim()).filter(Boolean),
        correctOptionIndex: Number(correctOptionIndex),
      }),
    onSuccess: () => {
      setQuestionText("");
      setOptions("");
      void queryClient.invalidateQueries({ queryKey: ["question-bank", branchId, filterClassId] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.classId")}</Label>
          <Input className="max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.questionText")}</Label>
          <Input className="min-w-64" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.optionsCsv")}</Label>
          <Input className="min-w-64" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="4, 5, 6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.correctIndex")}</Label>
          <Input className="max-w-20" type="number" value={correctOptionIndex} onChange={(e) => setCorrectOptionIndex(e.target.value)} />
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!classId || !subjectId || !questionText || !options}>
          {t("school.common.save")}
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.exams.filterByClassId")}</Label>
          <Input className="max-w-xs" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.exams.questionText")}</TableHead>
            <TableHead>{t("school.exams.optionsCsv")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(listQuery.data?.data ?? []).map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.questionText}</TableCell>
              <TableCell>{item.options.join(", ")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ExamsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.exams.title")}</h1>
      <Tabs defaultValue="exams">
        <TabsList>
          <TabsTrigger value="exams">{t("school.exams.examsTab")}</TabsTrigger>
          <TabsTrigger value="transcript">{t("school.exams.transcriptTab")}</TabsTrigger>
          <TabsTrigger value="onlineExams">{t("school.exams.onlineExamsTab")}</TabsTrigger>
          <TabsTrigger value="questionBank">{t("school.exams.questionBankTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
          <ExamsTab />
        </TabsContent>
        <TabsContent value="transcript">
          <TranscriptTab />
        </TabsContent>
        <TabsContent value="onlineExams">
          <OnlineExamsTab />
        </TabsContent>
        <TabsContent value="questionBank">
          <QuestionBankTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
