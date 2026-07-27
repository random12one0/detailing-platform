// Shared navigation model for the new admin — one source of truth for the mobile
// bottom tab bar and the desktop nav rail (paths are relative to /admin).
import { CalendarDays, DollarSign, Menu, Sun, Users } from "lucide-react";

export const NAV_ITEMS = [
  { key: "today", label: "Today", path: "today", icon: Sun },
  { key: "calendar", label: "Calendar", path: "calendar", icon: CalendarDays },
  { key: "money", label: "Money", path: "money", icon: DollarSign },
  { key: "clients", label: "Clients", path: "clients", icon: Users },
  { key: "more", label: "More", path: "more", icon: Menu },
];

// Find the active nav item for a given pathname (defaults to Today).
export const activeNavItem = (pathname = "") =>
  NAV_ITEMS.find((i) => pathname.includes(`/admin/${i.path}`)) || NAV_ITEMS[0];
