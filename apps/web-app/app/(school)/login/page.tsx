"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminApi, setAdminToken, AdminApiError } from "@/lib/admin-client";

export default function SchoolLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.login(tenantSlug, email, password);
      if ("challenge" in res.data) {
        setChallenge(res.data.challenge);
      } else {
        setAdminToken(res.data.accessToken);
        router.push("/students");
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTwoFa(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await adminApi.verifyTwoFa(challenge, code);
      setAdminToken(res.data.accessToken);
      router.push("/students");
    } catch (err) {
      setError(err instanceof AdminApiError ? `${err.code}: ${err.message}` : t("platform.errors.unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">{t("school.login.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!challenge ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tenantSlug">{t("school.login.tenantSlug")}</Label>
                <Input id="tenantSlug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t("school.login.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t("school.login.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? t("platform.common.loading") : t("school.login.submit")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTwoFa} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">{t("school.login.twoFaCode")}</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? t("platform.common.loading") : t("school.login.verify")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
