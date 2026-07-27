// MoreScreen — the "More" hub for the new admin. A tappable menu of management
// destinations (Catalog, Promo Codes, Business Settings) plus Log out. Selecting a
// row swaps into a sub-view that hosts the existing self-contained section behind a
// back button. Those hosted sections are internally dark-themed; hosted as-is for now.
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Wrench,
  Tag,
  Star,
  Images,
  Settings,
  LogOut,
  Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, Button, SectionHeader } from "@/admin/ui";
import ServicesAndAddOnsSection from "@/components/ServicesAndAddOnsSection";
import PromoCodesSection from "@/components/PromoCodesSection";
import BusinessSettingsSection from "@/components/BusinessSettingsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import GalleryEditor from "@/components/GalleryEditor";
import CampaignsSection from "@/components/CampaignsSection";
import BookingsListScreen from "@/admin/screens/BookingsListScreen";

// Menu destinations that route to an existing hosted section.
const MENU_ITEMS = [
  {
    key: "bookings",
    icon: ClipboardList,
    title: "All Bookings",
    subtitle: "Full searchable list of every booking",
  },
  {
    key: "catalog",
    icon: Wrench,
    title: "Services & Pricing",
    subtitle: "Packages, add-ons & plans shown on the public site",
  },
  {
    key: "promos",
    icon: Tag,
    title: "Promo Codes",
    subtitle: "Discount codes and their limits",
  },
  {
    key: "campaigns",
    icon: Link2,
    title: "Campaign Links",
    subtitle: "Trackable QR/ad links — visits, bookings & conversion",
  },
  {
    key: "reviews",
    icon: Star,
    title: "Reviews",
    subtitle: "Customer testimonials shown on the public site",
  },
  {
    key: "gallery",
    icon: Images,
    title: "Gallery",
    subtitle: "Photos & before/after pairs shown on the public site",
  },
  {
    key: "settings",
    icon: Settings,
    title: "Business Settings",
    subtitle: "Contact info, hours & service area",
  },
];

const SUB_VIEWS = {
  bookings: { title: "All Bookings", Section: BookingsListScreen },
  catalog: { title: "Services & Pricing", Section: ServicesAndAddOnsSection },
  promos: { title: "Promo Codes", Section: PromoCodesSection },
  campaigns: { title: "Campaign Links", Section: CampaignsSection },
  reviews: { title: "Reviews", Section: TestimonialsSection },
  gallery: { title: "Gallery", Section: GalleryEditor },
  settings: { title: "Business Settings", Section: BusinessSettingsSection },
};

// One tappable menu row — icon, title/subtitle, trailing chevron. 44px+ target.
function MenuRow({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[64px] items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:bg-muted active:scale-[0.99]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default function MoreScreen() {
  const [view, setView] = useState("menu");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Even if sign-out fails, send the user to the login gate.
      console.error("Sign out failed:", err);
    }
    // Full navigation so RequireAdmin re-evaluates and shows the login screen.
    window.location.assign("/admin");
  };

  // Sub-view: back header + the hosted section rendered as-is.
  if (view !== "menu") {
    const { title, Section } = SUB_VIEWS[view];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => setView("menu")}
          >
            <ChevronLeft />
            Back
          </Button>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
        <Section />
      </div>
    );
  }

  // Menu hub.
  return (
    <div className="space-y-6">
      <SectionHeader title="More" subtitle="Manage your catalog, promos & settings" />

      <div className="space-y-3">
        {MENU_ITEMS.map((item) => (
          <MenuRow
            key={item.key}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onClick={() => setView(item.key)}
          />
        ))}
      </div>

      {/* Log out — destructive, pinned at the bottom of the menu. */}
      <Card padded={false} className="overflow-hidden border-destructive/40">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full min-h-[56px] items-center gap-3 p-4 text-left text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <LogOut className="size-5" />
          </span>
          <span className="font-semibold">
            {loggingOut ? "Logging out…" : "Log out"}
          </span>
        </button>
      </Card>
    </div>
  );
}
