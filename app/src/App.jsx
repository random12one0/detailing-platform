import { useState } from "react";
import { CalendarDays, CircleDollarSign, Plus, Settings, Store, Sun, Users } from "lucide-react";
import { useBusiness } from "./context/BusinessContext.jsx";
import NewBookingModal from "./components/NewBookingModal.jsx";
import Auth from "./screens/Auth.jsx";
import CreateBusiness from "./screens/CreateBusiness.jsx";
import Today from "./screens/Today.jsx";
import Calendar from "./screens/Calendar.jsx";
import Money from "./screens/Money.jsx";
import Clients from "./screens/Clients.jsx";
import Business from "./screens/Business.jsx";
import GearMenu from "./components/GearMenu.jsx";

const TABS = [
  { key: "today", label: "Today", Icon: Sun, el: Today },
  { key: "calendar", label: "Calendar", Icon: CalendarDays, el: Calendar },
  { key: "money", label: "Money", Icon: CircleDollarSign, el: Money },
  { key: "clients", label: "Clients", Icon: Users, el: Clients },
  // THE FIFTH TAB IS "BUSINESS", NOT "MORE" — Part A settled the five
  // destinations and this is the one that had no name of its own. "More" is
  // a label that describes the menu rather than the thing, and it is why the
  // screen under it accumulated eleven rows in eight headings.
  { key: "business", label: "Business", Icon: Store, el: Business },
];

export default function App() {
  const { session, business, role, loading, signOut } = useBusiness();
  const [tab, setTab] = useState("today");
  // NEW BOOKING HAS ONE DOORWAY AND IT IS THE HEADER. It used to be a
  // full-width button at the bottom of Today AND another on Calendar — two
  // doors to one modal, each costing its screen a row it did not have to
  // spend. Owning it here is what lets both of those go.
  const [creating, setCreating] = useState(false);
  // THE GEAR IS A DESTINATION, NOT AN OVERLAY (GearMenu.jsx says why). It
  // lives beside `tab` rather than in it, so closing it puts the detailer
  // back on the screen they were on rather than on Today.
  const [gear, setGear] = useState(false);
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

  // The database policies are the real enforcement; this only stops the UI
  // offering what the session cannot use.
  // STAFF GET THREE, NOT FOUR, AND THE FOURTH IS BUSINESS. Money was always
  // hidden from them (the database returns them no expenses and no
  // settings); Business joins it because their whole Business screen would
  // be two rows and the database refuses the save on one of them
  // (architecture audit §2c items 2 and 3). Screen designs §10 says "staff
  // do not get a Business tab" and then counts four rail buttons — the
  // count is the desktop spec's older figure carried forward, written
  // before Business was also taken away. The RULE is the load-bearing half;
  // three is what the rule produces. What a staff session can use is behind
  // the gear, which they still have.
  const STAFF_HIDDEN = new Set(["money", "business"]);
  const visibleTabs = role === "owner" ? TABS : TABS.filter((t) => !STAFF_HIDDEN.has(t.key));
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
        <div className="row" style={{ gap: 4 }}>
          <button className="btn icon ghost" aria-label="New booking"
            onClick={() => setCreating(true)}>
            <Plus strokeWidth={2} />
          </button>
          {/* The plumbing. It is pressed to go in and pressed again to come
              back out, which is why it is aria-pressed rather than a link. */}
          <button className={`btn icon ghost${gear ? " on" : ""}`} aria-label="Settings"
            aria-pressed={gear} onClick={() => setGear((g) => !g)}>
            <Settings strokeWidth={2} />
          </button>
        </div>
      </header>
      <main className="app-main">
        {/* The gear takes the main area rather than floating over it, so a
            settings screen reached from it is the same page-or-column every
            settings screen is. `key` is not needed: GearMenu and a tab are
            different components, so React replaces one with the other. */}
        {gear ? <GearMenu onClose={() => setGear(false)} /> : <Active refreshKey={rev} />}
      </main>
      <nav className="tabbar">
        {visibleTabs.map((t) => (
          /* A TAB IS ONLY LIT WHEN IT IS WHAT YOU ARE LOOKING AT. With the
             gear open the main area is the gear, so no tab is current — a lit
             Today over a settings screen is the shell saying where you are
             not. Pressing any tab is also the way out of the gear. */
          <button key={t.key} className={!gear && activeTab.key === t.key ? "active" : ""}
            onClick={() => { setTab(t.key); setGear(false); }}>
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
