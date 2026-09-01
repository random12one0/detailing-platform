import { useState } from "react";
import { CalendarDays, CircleDollarSign, Plus, Settings, Sun, Users } from "lucide-react";
import { useBusiness } from "./context/BusinessContext.jsx";
import NewBookingModal from "./components/NewBookingModal.jsx";
import Auth from "./screens/Auth.jsx";
import CreateBusiness from "./screens/CreateBusiness.jsx";
import Today from "./screens/Today.jsx";
import Calendar from "./screens/Calendar.jsx";
import Money from "./screens/Money.jsx";
import Clients from "./screens/Clients.jsx";
import More from "./screens/More.jsx";

const TABS = [
  { key: "today", label: "Today", Icon: Sun, el: Today },
  { key: "calendar", label: "Calendar", Icon: CalendarDays, el: Calendar },
  { key: "money", label: "Money", Icon: CircleDollarSign, el: Money },
  { key: "clients", label: "Clients", Icon: Users, el: Clients },
  { key: "more", label: "More", Icon: Settings, el: More },
];

export default function App() {
  const { session, business, role, loading, signOut } = useBusiness();
  const [tab, setTab] = useState("today");
  // NEW BOOKING HAS ONE DOORWAY AND IT IS THE HEADER. It used to be a
  // full-width button at the bottom of Today AND another on Calendar — two
  // doors to one modal, each costing its screen a row it did not have to
  // spend. Owning it here is what lets both of those go.
  const [creating, setCreating] = useState(false);
  // A booking made from the header has to reach the screen that is showing.
  // A counter, not a remount: remounting would replace the screen with a
  // spinner, which is the very thing §1a of the screen designs forbids.
  const [rev, setRev] = useState(0);

  if (loading) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    );
  }
  if (!session) return <Auth />;
  // Signed in with no business: a brand new account (or a Google sign-in)
  // belongs in business creation, not at a dead end.
  if (!business) return <CreateBusiness />;

  // Staff never see Money. This mirrors the database policies (which are
  // the real enforcement) so the UI doesn't offer what the session can't read.
  const visibleTabs = role === "owner" ? TABS : TABS.filter((t) => t.key !== "money");
  const activeTab = visibleTabs.find((t) => t.key === tab) ?? visibleTabs[0];
  const Active = activeTab.el;

  return (
    <div className="app-shell">
      <header className="topbar">
        {/* The business's own name from the database — never a hardcoded brand. */}
        <div className="brand">{business.name}</div>
        {/* The screen's NAME used to sit here, which made three copies of it
            on one phone: the lit tab, this, and the screen's own masthead.
            docs/dashboard-phone-pass-2026-08-31.md §2d. */}
        <button className="btn icon ghost" aria-label="New booking"
          onClick={() => setCreating(true)}>
          <Plus strokeWidth={2} />
        </button>
      </header>
      <main className="app-main">
        <Active refreshKey={rev} />
      </main>
      <nav className="tabbar">
        {visibleTabs.map((t) => (
          <button key={t.key} className={activeTab.key === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            <t.Icon size={21} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </nav>
      {creating && (
        <NewBookingModal onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setRev((r) => r + 1); }} />
      )}
    </div>
  );
}
