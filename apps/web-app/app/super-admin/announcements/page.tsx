"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { platformApi } from "@/lib/platform-client";

export default function GlobalAnnouncementsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ title: "", body: "" });

  const mutation = useMutation({
    mutationFn: () => platformApi.createGlobalAnnouncement(form),
    onSuccess: () => {
      setForm({ title: "", body: "" });
      toast.success(t("platform.announcements.created") as string);
    },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-text-primary">{t("platform.announcements.title")}</h1>
        <Link href="/super-admin/tenants" className="text-sm text-brand hover:underline">
          {t("platform.revenue.backToTenants")}
        </Link>
      </div>
      <p className="text-sm text-text-secondary">{t("platform.announcements.hint")}</p>
      <div className="flex max-w-md flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("platform.announcements.titleField")}</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("platform.announcements.body")}</Label>
          <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <Button
          className="w-fit"
          onClick={() => mutation.mutate()}
          disabled={!form.title || !form.body || mutation.isPending}
        >
          {t("platform.announcements.send")}
        </Button>
      </div>
    </div>
  );
}
