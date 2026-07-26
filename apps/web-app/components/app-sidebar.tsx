"use client";

import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Wallet, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "students", icon: Users },
  { key: "fees", icon: Wallet },
  { key: "attendance", icon: CalendarCheck },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-surface p-4 md:flex">
      <div className="mb-6 px-2">
        <span className="font-heading text-xl font-bold text-brand">
          {t("app.name")}
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, icon: Icon }, index) => (
          <a
            key={key}
            href="#"
            aria-current={index === 0 ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors",
              "hover:bg-bg-elevated hover:text-text-primary",
              index === 0 && "bg-brand-tint text-brand"
            )}
          >
            <Icon className="h-5 w-5" />
            {t(`nav.${key}`)}
          </a>
        ))}
      </nav>
    </aside>
  );
}
