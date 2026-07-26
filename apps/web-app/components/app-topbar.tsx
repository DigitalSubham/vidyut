"use client";

import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";

export function AppTopbar() {
  const { t } = useTranslation();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="font-heading text-base font-semibold text-text-primary">
          {t("topbar.schoolPlaceholder")}
        </span>
        <Badge variant="secondary">{t("topbar.userPlaceholder")}</Badge>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
