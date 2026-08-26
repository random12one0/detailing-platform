// AdminShell — the whole new admin lives at a single URL (/admin). Tabs switch via
// local state (NOT the router), so navigating never changes the URL — this keeps the
// iOS "Add to Home Screen" standalone app from breaking out to Safari chrome on every
// tap. Mobile: sticky top title bar + fixed bottom tab bar (5 evenly-centered tabs, no
// FAB). Desktop (lg): left nav rail + content column capped at ~1100px.
import React, { useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { Button, ErrorBoundary } from "./ui";
import ManualBookingModal from "@/admin/modals/NewBookingModal";
import TodayScreen from "@/admin/screens/TodayScreen";
import CalendarScreen from "@/admin/screens/CalendarScreen";
import MoneyScreen from "@/admin/screens/MoneyScreen";
import ClientsScreen from "@/admin/screens/ClientsScreen";
import MoreScreen from "@/admin/screens/MoreScreen";

// Tab key → screen component. Rendered by state, no routing.
const SCREENS = {
  today: TodayScreen,
  calendar: CalendarScreen,
  money: MoneyScreen,
  clients: ClientsScreen,
  more: MoreScreen,
};

// One nav destination — icon over label (tab) or icon+label row (rail). A plain
// button that flips the active-tab state; no navigation, no URL change.
function TabButton({ item, variant, active, onClick }) {
  const { icon: Icon, label } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "rail"
          ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium min-h-[44px]"
          : "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-medium",
        active
          ? variant === "rail"
            ? "bg-accent text-accent-foreground"
            : "text-accent"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={variant === "rail" ? "size-5" : "size-6"} />
      <span>{label}</span>
    </button>
  );
}

export default function AdminShell() {
  const [tab, setTab] = useState("today");
  const [fabOpen, setFabOpen] = useState(false);

  const active = NAV_ITEMS.find((i) => i.key === tab) || NAV_ITEMS[0];
  const ActiveScreen = SCREENS[tab] || TodayScreen;

  // The new admin uses a cohesive dark-navy theme. Apply the `dark` class at the
  // document level while mounted so it also covers portaled modals/sheets, and
  // revert on unmount so the public site + old /admin stay light.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop nav rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card px-3 py-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="text-sm font-semibold">Andrew's Admin</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <TabButton
              key={item.key}
              item={item}
              variant="rail"
              active={tab === item.key}
              onClick={() => setTab(item.key)}
            />
          ))}
        </nav>
        <div className="mt-auto">
          <Button fullWidth onClick={() => setFabOpen(true)}>
            <Plus className="size-5" />
            New Booking
          </Button>
        </div>
      </aside>

      {/* Mobile top bar — shows the active tab title. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
        <h1 className="text-base font-semibold">{active.label}</h1>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </span>
      </header>

      {/* Content */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-4 pb-24 lg:py-8 lg:pb-10">
          <ErrorBoundary resetKey={tab}>
            <ActiveScreen />
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile bottom tab bar — 5 evenly-centered tabs, no FAB. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map((item) => (
            <TabButton
              key={item.key}
              item={item}
              variant="tab"
              active={tab === item.key}
              onClick={() => setTab(item.key)}
            />
          ))}
        </div>
      </nav>

      {/* New Booking — opened from the desktop rail button. */}
      {fabOpen && (
        <ManualBookingModal
          selectedDate={new Date()}
          onClose={() => setFabOpen(false)}
          onSave={() => setFabOpen(false)}
        />
      )}
    </div>
  );
}
