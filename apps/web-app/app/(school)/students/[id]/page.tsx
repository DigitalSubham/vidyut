"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminApi,
  AdminApiError,
  type BranchItem,
  type ClassItem,
  type SectionItem,
  type Student,
  type StudentTimelineEntry,
} from "@/lib/admin-client";

export default function StudentDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [siblings, setSiblings] = useState<Student[]>([]);
  const [timeline, setTimeline] = useState<StudentTimelineEntry[]>([]);
  const [timelineType, setTimelineType] = useState<"DISCIPLINE" | "ACHIEVEMENT" | "NOTE">("NOTE");
  const [timelineBody, setTimelineBody] = useState("");
  const [siblingId, setSiblingId] = useState("");

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [transferring, setTransferring] = useState(false);

  function refreshLifecycle(id: string) {
    adminApi.listSiblings(id).then((res) => setSiblings(res.data));
    adminApi.listTimelineEntries(id).then((res) => setTimeline(res.data));
  }

  useEffect(() => {
    adminApi.getStudent(params.id).then((res) => {
      setStudent(res.data);
      setRollNo(res.data.rollNo ?? "");
    });
    refreshLifecycle(params.id);
    adminApi.listBranches().then((res) => setBranches(res.data));
  }, [params.id]);

  useEffect(() => {
    if (!targetBranchId) return;
    adminApi.listClasses(targetBranchId).then((res) => setClasses(res.data));
  }, [targetBranchId]);

  useEffect(() => {
    if (!targetClassId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSections([]);
      return;
    }
    adminApi.listSections(targetClassId).then((res) => setSections(res.data));
  }, [targetClassId]);

  async function handleTransfer() {
    if (!student || !targetBranchId || !targetClassId || !targetSectionId) return;
    setTransferring(true);
    try {
      const res = await adminApi.transferStudent(student.id, { targetBranchId, targetClassId, targetSectionId });
      setStudent(res.data);
      // Clear the picker back to empty — the fields it held (this branch's
      // old class/section) no longer describe anything after a successful
      // transfer, and leaving them populated reads as "this is still
      // selected" when it isn't.
      setTargetBranchId("");
      setTargetClassId("");
      setTargetSectionId("");
      setClasses([]);
      setSections([]);
      toast.success(t("school.students.lifecycle.transferred") as string);
    } catch (err) {
      // handleTransfer is a plain click handler, not a useQuery/useMutation
      // call — components/query-provider.tsx's global error handler only
      // wraps those, so this needed its own try/catch (same reason every
      // other manual `await adminApi...` call in this file has none today:
      // it's not this screen's own inconsistency, it's a real gap in every
      // handler here — this is scoped to Transfer, as asked).
      const { title, description } = getErrorMessage(err);
      toast.error(title, { description });
    } finally {
      setTransferring(false);
    }
  }

  async function handleMarkAlumni() {
    if (!student) return;
    const res = await adminApi.markAlumni(student.id);
    setStudent(res.data);
  }

  async function handleReadmit() {
    if (!student || !targetClassId || !targetSectionId) return;
    const res = await adminApi.readmitStudent(student.id, { classId: targetClassId, sectionId: targetSectionId });
    setStudent(res.data);
  }

  async function handleLinkSibling() {
    if (!student || !siblingId) return;
    await adminApi.linkSiblings([student.id, siblingId]);
    setSiblingId("");
    refreshLifecycle(student.id);
  }

  async function handleAddTimeline() {
    if (!student || !timelineBody) return;
    await adminApi.createTimelineEntry(student.id, { type: timelineType, body: timelineBody });
    setTimelineBody("");
    refreshLifecycle(student.id);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await adminApi.patchStudent(params.id, { rollNo: rollNo || undefined });
      setStudent(res.data);
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSaving(false);
    }
  }

  if (!student) {
    return <p className="text-text-secondary">{t("school.common.loading")}</p>;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {student.firstName} {student.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.students.admissionNo")}</Label>
              <Input value={student.admissionNo} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rollNo">{t("school.students.rollNo")}</Label>
              <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? t("school.common.loading") : t("school.common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-lg">{t("school.students.lifecycle.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {t("school.students.status")}: <span className="font-medium">{student.status}</span>
          </p>

          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.lifecycle.targetBranch")}</Label>
            <Select value={targetBranchId} onValueChange={setTargetBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.class")}</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
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
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger>
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTransfer}
              disabled={!targetBranchId || !targetClassId || !targetSectionId || transferring}
            >
              {transferring ? t("school.common.loading") : t("school.students.lifecycle.transfer")}
            </Button>
            {student.status === "ACTIVE" ? (
              <Button type="button" variant="secondary" onClick={handleMarkAlumni}>
                {t("school.students.lifecycle.markAlumni")}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={handleReadmit} disabled={!targetClassId || !targetSectionId}>
                {t("school.students.lifecycle.readmit")}
              </Button>
            )}
          </div>

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
                placeholder={t("school.students.lifecycle.siblingIdPlaceholder") as string}
                value={siblingId}
                onChange={(e) => setSiblingId(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleLinkSibling} disabled={!siblingId}>
                {t("school.students.lifecycle.link")}
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
  );
}
