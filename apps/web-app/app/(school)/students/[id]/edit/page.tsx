"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, type StudentDetail } from "@/lib/admin-client";
import { getErrorMessage } from "@/lib/error-message";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"] as const;

export default function EditStudentPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [category, setCategory] = useState("");
  const [religion, setReligion] = useState("");
  const [address, setAddress] = useState("");

  const [error, setError] = useState<ReturnType<typeof getErrorMessage> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getStudent(params.id).then((res) => {
      const s = res.data;
      setStudent(s);
      setFirstName(s.firstName);
      setLastName(s.lastName);
      setRollNo(s.rollNo ?? "");
      setDob(s.dob.slice(0, 10));
      setGender(s.gender);
      setBloodGroup(s.bloodGroup ?? "");
      setCategory(s.category ?? "");
      setReligion(s.religion ?? "");
      setAddress(s.address);
    });
  }, [params.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await adminApi.patchStudent(params.id, {
        firstName,
        lastName,
        rollNo: rollNo || undefined,
        dob,
        gender,
        bloodGroup: bloodGroup || undefined,
        category: category || undefined,
        religion: religion || undefined,
        address,
      });
      toast.success(t("school.students.saved") as string);
      router.push(`/students/${params.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!student) {
    return <p className="text-text-secondary">{t("school.common.loading")}</p>;
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("school.students.editTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("school.students.admissionNo")}</Label>
              <Input value={student.admissionNo} disabled />
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
              <Label htmlFor="rollNo">{t("school.students.rollNo")}</Label>
              <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bloodGroup">{t("school.students.bloodGroup")}</Label>
              <Input id="bloodGroup" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">{t("school.students.category")}</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="religion">{t("school.students.religion")}</Label>
              <Input id="religion" value={religion} onChange={(e) => setReligion(e.target.value)} />
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
          <Button
            type="submit"
            disabled={saving || !firstName || !lastName || !dob || !gender || !address}
            className="w-fit"
          >
            {saving ? t("school.common.loading") : t("school.common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
