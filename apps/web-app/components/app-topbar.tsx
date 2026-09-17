"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GlobalSearch } from "@/components/global-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearAdminToken } from "@/lib/admin-client";

export function AppTopbar() {
  const { t } = useTranslation();
  const router = useRouter();

  function handleLogout() {
    clearAdminToken();
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="font-heading text-base font-semibold text-text-primary">
          {t("topbar.schoolPlaceholder")}
        </span>
        <Badge variant="secondary">{t("topbar.userPlaceholder")}</Badge>
      </div>
      <GlobalSearch />
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label={t("school.notifications.title") as string}>
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
          </Link>
        </Button>
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" aria-label={t("topbar.logout") as string} onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
