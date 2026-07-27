"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, getAdminBranchId, AdminApiError, type ClassItem, type SectionItem } from "@/lib/admin-client";

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
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        rollNo: rollNo || undefined,
      });
      router.push(`/students/${student.data.id}`);
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("school.students.add")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.class")}</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
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
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("school.students.section")}</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
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
            <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">{t("school.students.address")}</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rollNo">{t("school.students.rollNo")}</Label>
            <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={submitting || !classId || !sectionId}>
            {submitting ? t("school.common.loading") : t("school.common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
