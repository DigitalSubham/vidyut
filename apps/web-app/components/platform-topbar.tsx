"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { clearPlatformToken } from "@/lib/platform-client";

export function PlatformTopbar() {
  const { t } = useTranslation();
  const router = useRouter();

  function handleLogout() {
    clearPlatformToken();
    router.push("/super-admin/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-surface px-4 md:px-6">
      <span className="font-heading text-base font-semibold text-text-primary">{t("platform.common.title")}</span>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" aria-label={t("topbar.logout") as string} onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
