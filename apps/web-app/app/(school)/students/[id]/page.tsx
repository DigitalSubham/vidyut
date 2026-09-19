"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminApi,
  AdminApiError,
  type ClassItem,
  type GuardianLink,
  type SectionItem,
  type Student,
  type StudentDetail,
  type StudentTimelineEntry,
} from "@/lib/admin-client";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary">{value || "—"}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);

  const [guardians, setGuardians] = useState<GuardianLink[] | null>(null);
  const [guardiansForbidden, setGuardiansForbidden] = useState(false);

  const [siblings, setSiblings] = useState<Student[]>([]);
  const [timeline, setTimeline] = useState<StudentTimelineEntry[]>([]);
  const [timelineType, setTimelineType] = useState<"DISCIPLINE" | "ACHIEVEMENT" | "NOTE">("NOTE");
  const [timelineBody, setTimelineBody] = useState("");
  const [siblingAdmissionNo, setSiblingAdmissionNo] = useState("");
  const [linkingSibling, setLinkingSibling] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [readmitClassId, setReadmitClassId] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [readmitSectionId, setReadmitSectionId] = useState("");

  function refreshLifecycle(id: string) {
    adminApi.listSiblings(id).then((res) => setSiblings(res.data));
    adminApi.listTimelineEntries(id).then((res) => setTimeline(res.data));
  }

  useEffect(() => {
    adminApi.getStudent(params.id).then((res) => {
      setStudent(res.data);
      adminApi.listClasses(res.data.branchId).then((classesRes) => setClasses(classesRes.data));
    });
    adminApi
      .listStudentGuardians(params.id)
      .then((res) => setGuardians(res.data))
      .catch((err) => {
        if (err instanceof AdminApiError && err.code === "FORBIDDEN") {
          setGuardiansForbidden(true);
        }
      });
    refreshLifecycle(params.id);
  }, [params.id]);

  useEffect(() => {
    if (!readmitClassId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSections([]);
      return;
    }
    adminApi.listSections(readmitClassId).then((res) => setSections(res.data));
  }, [readmitClassId]);

  async function handleMarkAlumni() {
    if (!student) return;
    const res = await adminApi.markAlumni(student.id);
    setStudent((current) => (current ? { ...current, ...res.data } : current));
  }

  async function handleReadmit() {
    if (!student || !readmitClassId || !readmitSectionId) return;
    const res = await adminApi.readmitStudent(student.id, { classId: readmitClassId, sectionId: readmitSectionId });
    setStudent((current) => (current ? { ...current, ...res.data } : current));
  }

  async function handleLinkSibling() {
    if (!student || !siblingAdmissionNo) return;
    setLinkingSibling(true);
    try {
      const found = await adminApi.findStudentByAdmissionNo(student.branchId, siblingAdmissionNo);
      await adminApi.linkSiblings([student.id, found.data.id]);
      setSiblingAdmissionNo("");
      refreshLifecycle(student.id);
      toast.success(t("school.students.lifecycle.siblingLinked") as string);
    } catch (err) {
      const { title, description } = getErrorMessage(err);
      toast.error(title, { description });
    } finally {
      setLinkingSibling(false);
    }
  }

  async function handleAddTimeline() {
    if (!student || !timelineBody) return;
    await adminApi.createTimelineEntry(student.id, { type: timelineType, body: timelineBody });
    setTimelineBody("");
    refreshLifecycle(student.id);
  }

  if (!student) {
    return <p className="text-text-secondary">{t("school.common.loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-xl">
            {student.firstName} {student.lastName}
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}/edit`}>{t("school.students.edit")}</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <DetailRow label={t("school.students.admissionNo")} value={student.admissionNo} />
          <DetailRow label={t("school.students.rollNo")} value={student.rollNo ?? ""} />
          <DetailRow
            label={t("school.students.currentClass")}
            value={
              student.enrollment
                ? `${student.enrollment.className} — ${student.enrollment.sectionName}`
                : t("school.students.noEnrollment")
            }
          />
          <DetailRow label={t("school.students.status")} value={student.status} />
          <DetailRow label={t("school.students.dob")} value={new Date(student.dob).toLocaleDateString()} />
          <DetailRow label={t("school.students.gender")} value={t(`school.students.genders.${student.gender}`, student.gender)} />
          <DetailRow label={t("school.students.bloodGroup")} value={student.bloodGroup ?? ""} />
          <DetailRow label={t("school.students.category")} value={student.category ?? ""} />
          <DetailRow label={t("school.students.religion")} value={student.religion ?? ""} />
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <DetailRow label={t("school.students.address")} value={student.address} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!guardiansForbidden && (
          <Card className="rounded-2xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-heading text-lg">{t("school.students.guardians.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!guardians ? (
                <p className="text-sm text-text-secondary">{t("school.common.loading")}</p>
              ) : guardians.length === 0 ? (
                <p className="text-sm text-text-secondary">{t("school.students.guardians.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {guardians.map((g) => (
                    <li key={g.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{g.name}</span>
                        <Badge variant="secondary">{t(`school.students.guardians.relations.${g.relation}`)}</Badge>
                        {g.isPrimary && <Badge>{t("school.students.guardians.primary")}</Badge>}
                        {g.canPay && <Badge variant="outline">{t("school.students.guardians.canPay")}</Badge>}
                      </div>
                      <span className="text-sm text-text-secondary">{g.phone}</span>
                      {g.email && <span className="text-sm text-text-secondary">{g.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`rounded-2xl ${guardiansForbidden ? "lg:col-span-3" : "lg:col-span-2"}`}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{t("school.students.lifecycle.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {student.status === "ACTIVE" ? (
              <Button type="button" variant="secondary" onClick={handleMarkAlumni} className="w-fit">
                {t("school.students.lifecycle.markAlumni")}
              </Button>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("school.students.class")}</Label>
                  <Select value={readmitClassId} onValueChange={setReadmitClassId}>
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
                  <Label>{t("school.students.section")}</Label>
                  <Select value={readmitSectionId} onValueChange={setReadmitSectionId}>
                    <SelectTrigger className="w-40">
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReadmit}
                  disabled={!readmitClassId || !readmitSectionId}
                >
                  {t("school.students.lifecycle.readmit")}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-1.5 border-t pt-4">
              <Label>{t("school.students.lifecycle.siblings")}</Label>
              {siblings.length === 0 ? (
                <p className="text-sm text-text-secondary">{t("school.students.lifecycle.noSiblings")}</p>
              ) : (
                <ul className="text-sm text-text-secondary">
                  {siblings.map((s) => (
                    <li key={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNo})
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={t("school.students.lifecycle.siblingAdmissionNoPlaceholder") as string}
                  value={siblingAdmissionNo}
                  onChange={(e) => setSiblingAdmissionNo(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLinkSibling}
                  disabled={!siblingAdmissionNo || linkingSibling}
                >
                  {linkingSibling ? t("school.common.loading") : t("school.students.lifecycle.link")}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t pt-4">
              <Label>{t("school.students.lifecycle.timeline")}</Label>
              <ul className="flex flex-col gap-1 text-sm text-text-secondary">
                {timeline.map((e) => (
                  <li key={e.id}>
                    <span className="font-medium">{e.type}</span> — {e.body}
                  </li>
                ))}
              </ul>
              <Select value={timelineType} onValueChange={(v) => setTimelineType(v as typeof timelineType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">NOTE</SelectItem>
                  <SelectItem value="ACHIEVEMENT">ACHIEVEMENT</SelectItem>
                  <SelectItem value="DISCIPLINE">DISCIPLINE</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input value={timelineBody} onChange={(e) => setTimelineBody(e.target.value)} />
                <Button type="button" variant="secondary" onClick={handleAddTimeline} disabled={!timelineBody}>
                  {t("school.students.lifecycle.add")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
