"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, getAdminBranchId, type ClassItem, type SectionItem } from "@/lib/admin-client";

function useClassesAndSections() {
  const branchId = getAdminBranchId() ?? "";
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    if (!branchId) return;
    adminApi.listClasses(branchId).then((res) => setClasses(res.data));
  }, [branchId]);

  useEffect(() => {
    if (!classId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSections([]);
      return;
    }
    adminApi.listSections(classId).then((res) => setSections(res.data));
  }, [classId]);

  return { branchId, classes, sections, classId, setClassId, sectionId, setSectionId };
}

function SyllabusTab() {
  const { t } = useTranslation();
  const { branchId, classes, classId, setClassId } = useClassesAndSections();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [form, setForm] = useState({ title: "", order: "" });

  const chaptersQuery = useQuery({
    queryKey: ["lms-syllabus", subjectId, classId],
    queryFn: () => adminApi.listSyllabusChapters(subjectId, classId),
    enabled: !!subjectId && !!classId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSyllabusChapter({ branchId, subjectId, classId, title: form.title, order: Number(form.order) }),
    onSuccess: () => {
      setForm({ title: "", order: "" });
      void queryClient.invalidateQueries({ queryKey: ["lms-syllabus", subjectId, classId] });
    },
  });
  const completeMutation = useMutation({
    mutationFn: (id: string) => adminApi.completeSyllabusChapter(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["lms-syllabus", subjectId, classId] }),
  });

  const chapters = chaptersQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.class")}</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.timetable.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.lms.chapterTitle") as string}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          className="max-w-[6rem]"
          type="number"
          placeholder={t("school.lms.order") as string}
          value={form.order}
          onChange={(e) => setForm({ ...form, order: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!subjectId || !classId || !form.title || !form.order}>
          {t("school.lms.addChapter")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.lms.order")}</TableHead>
            <TableHead>{t("school.lms.chapterTitle")}</TableHead>
            <TableHead>{t("school.frontOffice.status")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapters.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.order}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.completedAt ? t("school.lms.done") : t("school.lms.pending")}</TableCell>
              <TableCell>
                {!c.completedAt ? (
                  <Button variant="outline" size="sm" onClick={() => completeMutation.mutate(c.id)}>
                    {t("school.lms.markDone")}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LessonPlansTab() {
  const { t } = useTranslation();
  const { branchId, classes, sections, classId, setClassId, sectionId, setSectionId } = useClassesAndSections();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [form, setForm] = useState({ date: "", topic: "", notes: "" });

  const plansQuery = useQuery({
    queryKey: ["lms-lesson-plans", sectionId],
    queryFn: () => adminApi.listLessonPlans(sectionId),
    enabled: !!sectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createLessonPlan({ branchId, subjectId, sectionId, date: form.date, topic: form.topic, notes: form.notes || undefined }),
    onSuccess: () => {
      setForm({ date: "", topic: "", notes: "" });
      void queryClient.invalidateQueries({ queryKey: ["lms-lesson-plans", sectionId] });
    },
  });

  const plans = plansQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.class")}</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.students.section")}</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.timetable.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.lms.topic") as string}
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!subjectId || !sectionId || !form.date || !form.topic}>
          {t("school.lms.addPlan")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.students.dob")}</TableHead>
            <TableHead>{t("school.lms.topic")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
              <TableCell>{p.topic}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ContentLibraryTab() {
  const { t } = useTranslation();
  const { branchId, classes, classId, setClassId } = useClassesAndSections();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [form, setForm] = useState({ title: "", linkUrl: "" });

  const itemsQuery = useQuery({
    queryKey: ["lms-content-items", subjectId, classId],
    queryFn: () => adminApi.listContentItems(subjectId, classId),
    enabled: !!subjectId && !!classId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createContentItem({ branchId, subjectId, classId, title: form.title, type: "LINK", linkUrl: form.linkUrl }),
    onSuccess: () => {
      setForm({ title: "", linkUrl: "" });
      void queryClient.invalidateQueries({ queryKey: ["lms-content-items", subjectId, classId] });
    },
  });

  const items = itemsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.class")}</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.timetable.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <Input
          className="max-w-[14rem]"
          placeholder={t("school.lms.contentTitle") as string}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          className="max-w-xs"
          placeholder={t("school.lms.linkUrl") as string}
          value={form.linkUrl}
          onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!subjectId || !classId || !form.title || !form.linkUrl}>
          {t("school.lms.addContent")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.lms.contentTitle")}</TableHead>
            <TableHead>{t("school.lms.linkUrl")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{i.title}</TableCell>
              <TableCell>
                {i.linkUrl ? (
                  <a href={i.linkUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {i.linkUrl}
                  </a>
                ) : (
                  i.fileUrl
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LiveClassesTab() {
  const { t } = useTranslation();
  const { branchId, classes, sections, classId, setClassId, sectionId, setSectionId } = useClassesAndSections();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState("");
  const [form, setForm] = useState({ startTime: "", joinUrl: "" });

  const linksQuery = useQuery({
    queryKey: ["lms-live-classes", sectionId],
    queryFn: () => adminApi.listLiveClassLinks(sectionId),
    enabled: !!sectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createLiveClassLink({ branchId, subjectId, sectionId, startTime: form.startTime, joinUrl: form.joinUrl }),
    onSuccess: () => {
      setForm({ startTime: "", joinUrl: "" });
      void queryClient.invalidateQueries({ queryKey: ["lms-live-classes", sectionId] });
    },
  });

  const links = linksQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.academicStructure.class")}</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.students.section")}</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("school.timetable.subjectId")}</Label>
          <Input className="max-w-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        </div>
        <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        <Input
          className="max-w-xs"
          placeholder={t("school.lms.joinUrl") as string}
          value={form.joinUrl}
          onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
        />
        <Button onClick={() => createMutation.mutate()} disabled={!subjectId || !sectionId || !form.startTime || !form.joinUrl}>
          {t("school.lms.schedule")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("school.students.dob")}</TableHead>
            <TableHead>{t("school.lms.joinUrl")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{new Date(l.startTime).toLocaleString()}</TableCell>
              <TableCell>
                <a href={l.joinUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  {l.joinUrl}
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function LmsPage() {
  const { t } = useTranslation();
  const branchId = getAdminBranchId() ?? "";

  if (!branchId) {
    return <p className="text-text-secondary">{t("school.branchIdPlaceholder")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("school.lms.title")}</h1>

      <Tabs defaultValue="syllabus">
        <TabsList>
          <TabsTrigger value="syllabus">{t("school.lms.syllabusTab")}</TabsTrigger>
          <TabsTrigger value="lessonPlans">{t("school.lms.lessonPlansTab")}</TabsTrigger>
          <TabsTrigger value="content">{t("school.lms.contentTab")}</TabsTrigger>
          <TabsTrigger value="liveClasses">{t("school.lms.liveClassesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="syllabus">
          <SyllabusTab />
        </TabsContent>
        <TabsContent value="lessonPlans">
          <LessonPlansTab />
        </TabsContent>
        <TabsContent value="content">
          <ContentLibraryTab />
        </TabsContent>
        <TabsContent value="liveClasses">
          <LiveClassesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
