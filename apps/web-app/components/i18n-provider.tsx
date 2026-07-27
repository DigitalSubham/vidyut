"use client";

import { type ComponentType, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18next from "@/lib/i18n";

// apps/mobile (Unit 15b) introduced react-native as a workspace-wide
// optional peer of react-i18next; pnpm then resolves a second, divergent
// @types/react instance for I18nextProvider's own prop types here, which no
// longer structurally matches this file's React 19 types. Re-typing the
// component against this file's own ReactNode is the standard workaround
// for two non-identical @types/react instances in one monorepo.
const TypedI18nextProvider = I18nextProvider as unknown as ComponentType<{
  i18n: typeof i18next;
  children: ReactNode;
}>;

export function I18nProvider({ children }: { children: ReactNode }) {
  return <TypedI18nextProvider i18n={i18next}>{children}</TypedI18nextProvider>;
}
