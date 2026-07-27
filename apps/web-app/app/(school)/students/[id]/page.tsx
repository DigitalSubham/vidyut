"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminApi, AdminApiError, type Student } from "@/lib/admin-client";

export default function StudentDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getStudent(params.id).then((res) => {
      setStudent(res.data);
      setRollNo(res.data.rollNo ?? "");
    });
  }, [params.id]);

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
    <Card className="max-w-xl rounded-2xl">
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
  );
}
