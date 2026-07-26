"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-secondary">{t("language.label")}</span>
      <div className="flex gap-1">
        {SUPPORTED_LANGUAGES.map((lng: SupportedLanguage) => (
          <Button
            key={lng}
            type="button"
            size="sm"
            variant={i18n.language === lng ? "default" : "outline"}
            className={cn("min-w-16")}
            onClick={() => void i18n.changeLanguage(lng)}
          >
            {t(`language.${lng === "en" ? "english" : "hindi"}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
