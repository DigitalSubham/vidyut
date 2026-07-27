import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en/common.json";
import hi from "../locales/hi/common.json";

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? "en";

void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, hi: { common: hi } },
  lng: deviceLanguage === "hi" ? "hi" : "en",
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
