"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Users, Wallet, CalendarCheck, LayoutDashboard, Settings, BadgeCheck, Layers, GraduationCap, CalendarClock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminRoles } from "@/lib/admin-client";

/**
 * Unit 27's reference-module nav — role-filtered per context/feature-specs/
 * 27's Open Question 2, but by role (not permission — no `GET /auth/me`
 * endpoint exists yet to fetch effective permissions, see admin-client.ts).
 * Units 42/43/44/46 added their own screens (staff, academic structure,
 * exams) on top of the original students/fees/attendance/settings set;
 * guardians/admissions/announcements/certificates/homework remain
 * fast-follow work, not built here. Unit 47 added timetable (substitutions).
 */
const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "PRINCIPAL"] },
  { key: "students", href: "/students", icon: Users, roles: ["OWNER", "PRINCIPAL", "ADMIN", "ACCOUNTANT", "TEACHER"] },
  { key: "staff", href: "/staff", icon: BadgeCheck, roles: ["OWNER", "PRINCIPAL", "ADMIN"] },
  { key: "fees", href: "/fees", icon: Wallet, roles: ["OWNER", "PRINCIPAL", "ADMIN", "ACCOUNTANT"] },
  { key: "attendance", href: "/attendance", icon: CalendarCheck, roles: ["OWNER", "PRINCIPAL", "ADMIN", "TEACHER"] },
  { key: "academicStructure", href: "/academic-structure", icon: Layers, roles: ["OWNER", "PRINCIPAL", "ADMIN"] },
  { key: "exams", href: "/exams", icon: GraduationCap, roles: ["OWNER", "PRINCIPAL", "ADMIN", "TEACHER"] },
  { key: "timetable", href: "/timetable", icon: CalendarClock, roles: ["OWNER", "PRINCIPAL", "ADMIN"] },
  { key: "engagement", href: "/engagement", icon: MessageSquare, roles: ["OWNER", "PRINCIPAL", "ADMIN"] },
  { key: "settings", href: "/settings", icon: Settings, roles: ["OWNER", "PRINCIPAL"] },
] as const;

export function SchoolSidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const roles = getAdminRoles();
  const items = NAV_ITEMS.filter((item) => item.roles.some((r) => roles.includes(r)));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-surface p-4 md:flex">
      <div className="mb-6 px-2">
        <span className="font-heading text-xl font-bold text-brand">{t("app.name")}</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ key, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors",
              "hover:bg-bg-elevated hover:text-text-primary",
              pathname.startsWith(href) && "bg-brand-tint text-brand"
            )}
          >
            <Icon className="h-5 w-5" />
            {t(`nav.${key}`)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
