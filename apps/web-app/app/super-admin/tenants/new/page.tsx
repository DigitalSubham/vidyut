"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformApi, PlatformApiError } from "@/lib/platform-client";

const PLAN_OPTIONS = ["STARTER", "STANDARD", "PRO", "ENTERPRISE"] as const;

interface FormState {
  name: string;
  slug: string;
  planKey: (typeof PLAN_OPTIONS)[number];
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export default function NewTenantPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    planKey: "STANDARD",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await platformApi.createTenant(form);
      router.push(`/super-admin/tenants/${res.data.tenant.id}`);
    } catch (err) {
      setError(err instanceof PlatformApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <Card className="max-w-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">{t("platform.newTenant.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t("platform.newTenant.schoolName")}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">{t("platform.newTenant.slug")}</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(event) => update("slug", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planKey">{t("platform.newTenant.plan")}</Label>
              <Select value={form.planKey} onValueChange={(value) => update("planKey", value as FormState["planKey"])}>
                <SelectTrigger id="planKey">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {plan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerName">{t("platform.newTenant.ownerName")}</Label>
              <Input
                id="ownerName"
                value={form.ownerName}
                onChange={(event) => update("ownerName", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerEmail">{t("platform.newTenant.ownerEmail")}</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={form.ownerEmail}
                onChange={(event) => update("ownerEmail", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ownerPassword">{t("platform.newTenant.ownerPassword")}</Label>
              <Input
                id="ownerPassword"
                type="password"
                value={form.ownerPassword}
                onChange={(event) => update("ownerPassword", event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? t("platform.common.loading") : t("platform.newTenant.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
