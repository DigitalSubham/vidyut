"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/common.json";
import hi from "@/locales/hi/common.json";

export const SUPPORTED_LANGUAGES = ["en", "hi"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    resources: {
      en: { common: en },
      hi: { common: hi },
    },
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18next;
