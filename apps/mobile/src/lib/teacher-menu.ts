import { BookOpen, CalendarCheck, CalendarOff, ClipboardCheck, LayoutDashboard, MessageSquare, PenLine, type LucideIcon } from "lucide-react-native";
import type { DrawerGroup } from "../components/AppDrawer";

export type TeacherTab = "attendance" | "marks" | "homework" | "grading" | "messages" | "leave" | "summary";

/** Grouped for the sidebar, same pattern as parent-menu.ts. */
export const TEACHER_MENU_GROUP_KEYS: DrawerGroup<TeacherTab>[] = [
  { label: "overview", items: ["summary"] },
  { label: "classroom", items: ["attendance", "marks", "homework", "grading"] },
  { label: "communication", items: ["messages"] },
  { label: "account", items: ["leave"] },
];

export const TEACHER_TAB_ICONS: Record<TeacherTab, LucideIcon> = {
  summary: LayoutDashboard,
  attendance: CalendarCheck,
  marks: PenLine,
  homework: BookOpen,
  grading: ClipboardCheck,
  messages: MessageSquare,
  leave: CalendarOff,
};
