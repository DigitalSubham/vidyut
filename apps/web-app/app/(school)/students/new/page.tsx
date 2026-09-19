"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminApi, getAdminBranchId, type ClassItem, type SectionItem } from "@/lib/admin-client";
import { getErrorMessage } from "@/lib/error-message";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"] as const;

function CreateClassDialog({
  open,
  onOpenChange,
  branchId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  onCreated: (cls: ClassItem) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await adminApi.createClass({ branchId, name, order: Number(order) });
      onCreated(res.data);
      setName("");
      setOrder("");
      onOpenChange(false);
      toast.success(t("school.academicStructure.classCreated") as string);
    } catch (err) {
      toast.error(getErrorMessage(err).title);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("school.academicStructure.createClass")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.className")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("school.academicStructure.classNamePlaceholder") as string}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.classOrder")}</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <Button type="submit" disabled={!name || !order || creating}>
            {t("school.academicStructure.createClass")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSectionDialog({
  open,
  onOpenChange,
  classes,
  defaultClassId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassItem[];
  defaultClassId: string;
  onCreated: (classId: string, section: SectionItem) => void;
}) {
  const { t } = useTranslation();
  // `defaultClassId` is only read as this component's initial state — the
  // parent forces a remount (via `key`) whenever it changes, instead of an
  // effect resetting this on every re-render.
  const [sectionClassId, setSectionClassId] = useState(defaultClassId);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await adminApi.createSection(sectionClassId, {
        name,
        capacity: capacity ? Number(capacity) : undefined,
      });
      onCreated(sectionClassId, res.data);
      setName("");
      setCapacity("");
      onOpenChange(false);
      toast.success(t("school.academicStructure.sectionCreated") as string);
    } catch (err) {
      toast.error(getErrorMessage(err).title);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("school.academicStructure.createSection")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.class")}</Label>
            <Select value={sectionClassId} onValueChange={setSectionClassId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("school.common.select") as string} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.sectionName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.academicStructure.sectionCapacity")}</Label>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <Button type="submit" disabled={!sectionClassId || !name || creating}>
            {t("school.academicStructure.createSection")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function NewStudentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const branchId = getAdminBranchId() ?? "";
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState<ReturnType<typeof getErrorMessage> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);

  async function refreshClasses() {
    if (!branchId) return;
    const res = await adminApi.listClasses(branchId);
    setClasses(res.data);
  }

  async function refreshSections(id: string) {
    const res = await adminApi.listSections(id);
    setSections(res.data);
  }

  useEffect(() => {
    if (!branchId) return;
    adminApi.listClasses(branchId).then((res) => setClasses(res.data));
  }, [branchId]);

  useEffect(() => {
    if (!classId) {
      // Resetting sections when the class selection clears, not deriving
      // state from a render — the non-empty branch below is a real async
      // fetch, so this effect can't be replaced by a render-time computation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSections([]);
      return;
    }
    adminApi.listSections(classId).then((res) => setSections(res.data));
  }, [classId]);

  async function handleClassCreated(cls: ClassItem) {
    await refreshClasses();
    setClassId(cls.id);
  }

  async function handleSectionCreated(forClassId: string, section: SectionItem) {
    if (forClassId !== classId) return;
    await refreshSections(classId);
    setSectionId(section.id);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const student = await adminApi.createStudent({
        branchId,
        classId,
        sectionId,
        firstName,
        lastName,
        dob,
        gender,
        address,
        admissionNo: admissionNo || undefined,
        rollNo: rollNo || undefined,
      });
      router.push(`/students/${student.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("school.students.add")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.students.class")}</Label>
              <div className="flex items-center gap-2">
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={t("school.academicStructure.createClass") as string}
                  onClick={() => {
                    setCreateSectionOpen(false);
                    setCreateClassOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.students.section")}</Label>
              <div className="flex items-center gap-2">
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={t("school.academicStructure.createSection") as string}
                  onClick={() => {
                    setCreateClassOpen(false);
                    setCreateSectionOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admissionNo">{t("school.students.admissionNo")}</Label>
              <Input
                id="admissionNo"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                placeholder={t("school.students.admissionNoPlaceholder") as string}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rollNo">{t("school.students.rollNo")}</Label>
              <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">{t("school.students.firstName")}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">{t("school.students.lastName")}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dob">{t("school.students.dob")}</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">{t("school.students.gender")}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`school.students.genders.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">{t("school.students.address")}</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm text-danger">
              {error.title}
              {error.description ? ` — ${error.description}` : ""}
            </p>
          )}
          <Button type="submit" disabled={submitting || !classId || !sectionId || !gender} className="w-fit">
            {submitting ? t("school.common.loading") : t("school.common.save")}
          </Button>
        </form>
      </CardContent>

      <CreateClassDialog
        open={createClassOpen}
        onOpenChange={setCreateClassOpen}
        branchId={branchId}
        onCreated={handleClassCreated}
      />
      <CreateSectionDialog
        key={classId || "no-class"}
        open={createSectionOpen}
        onOpenChange={setCreateSectionOpen}
        classes={classes}
        defaultClassId={classId}
        onCreated={handleSectionCreated}
      />
    </Card>
  );
}
