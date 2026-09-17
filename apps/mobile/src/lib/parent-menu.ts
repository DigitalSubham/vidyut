import {
  AlertCircle,
  BookOpen,
  Bus,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  Image,
  Library,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import type { DrawerGroup } from "../components/AppDrawer";

export type Section =
  | "fees"
  | "attendance"
  | "reportCards"
  | "notices"
  | "homework"
  | "timetable"
  | "calendar"
  | "onlineExams"
  | "circulars"
  | "complaints"
  | "messages"
  | "ptm"
  | "surveys"
  | "gallery"
  | "transport"
  | "library"
  | "store"
  | "timeline"
  | "lms"
  | "settings";

/** Grouped for the sidebar (context/ui-context.md's "outcome-oriented, not abstract modules" principle) — a flat list of 20 items is a wall of text; grouped by what a parent's actually trying to do reads as a menu, not a dump. */
export const PARENT_MENU_GROUP_KEYS: DrawerGroup<Section>[] = [
  { label: "academics", items: ["attendance", "reportCards", "homework", "timetable", "calendar", "onlineExams", "lms"] },
  { label: "fees", items: ["fees", "store"] },
  { label: "communication", items: ["notices", "circulars", "messages", "ptm", "surveys", "complaints"] },
  { label: "campus", items: ["gallery", "transport", "library", "timeline"] },
  { label: "account", items: ["settings"] },
];

export const SECTION_ICONS: Record<Section, LucideIcon> = {
  fees: Wallet,
  attendance: CalendarCheck,
  reportCards: GraduationCap,
  notices: Megaphone,
  homework: BookOpen,
  timetable: CalendarClock,
  calendar: Calendar,
  onlineExams: ClipboardCheck,
  circulars: FileText,
  complaints: AlertCircle,
  messages: MessageSquare,
  ptm: Users,
  surveys: ClipboardList,
  gallery: Image,
  transport: Bus,
  library: Library,
  store: ShoppingBag,
  timeline: History,
  lms: NotebookPen,
  settings: Settings,
};
