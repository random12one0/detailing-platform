import { useEffect, useRef, useState } from "react";
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
import SetupForm from "./components/SetupForm.jsx";
import Walkthrough from "./components/Walkthrough.jsx";

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

// WHETHER THIS DEVICE HAS BEEN SHOWN AROUND. localStorage rather than the
// database, and for the same reason BusinessContext keeps the preferred
// business there: it is a fact about this browser, not about the account. A
// second device gets the tour once, which is right — it is a tour of a
// SCREEN, and that screen is a different shape on a phone and at a desk.
const TOUR_KEY = "dp.tour";
const tourSeen = () => { try { return !!localStorage.getItem(TOUR_KEY); } catch { return false; } };
const markTourSeen = () => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* private mode */ } };

export default function App() {
  const { session, business, settings, role, can, loading, signOut } = useBusiness();
  // NEW BOOKING HAS ONE DOORWAY AND IT IS THE HEADER. It used to be a
  // full-width button at the bottom of Today AND another on Calendar — two
  // doors to one modal, each costing its screen a row it did not have to
  // spend. Owning it here is what lets both of those go.
  const [creating, setCreating] = useState(false);
  // THE GEAR IS A DESTINATION, NOT AN OVERLAY (GearMenu.jsx says why). It
  // lives beside `tab` rather than in it, so closing it puts the detailer
  // back on the screen they were on rather than on Today.
  const [gear, setGear] = useState(false);
  // FIRST RUN — ONE STATE, TWO SEPARATE THINGS (screen designs §13, and the
  // owner kept them two on purpose). "setup" is the stepped form, "tour" is
  // the walkthrough; neither is a mode the shell has to know anything else
  // about, so one nullable string holds both.
  const [firstRun, setFirstRun] = useState(null);
  const [tab, setTab] = useState("today");
  // WHAT A SCREEN WAS OPENED *FOR* — roadmap 2.19, and it is one string
  // because there is one case. Today's re-book prompt has to land on Clients
  // with the "not seen in 3 months" filter already on: sending somebody to a
  // list of two hundred names after telling them fourteen need attention is
  // handing them the question again instead of the answer.
  // CLEARED BY ANY TAB PRESS below, so it survives exactly one arrival.
  const [intent, setIntent] = useState(null);
  // A booking made from the header has to reach the screen that is showing.
  // A counter, not a remount: remounting would replace the screen with a
  // spinner, which is the very thing §1a of the screen designs forbids.
  const [rev, setRev] = useState(0);

  // WHAT OPENS BY ITSELF, AND EXACTLY ONCE. Runs when the tenant lands, never
  // again in this session — a detailer who skips the form must not meet it
  // again three taps later.
  //
  //   THE FORM     an OWNER whose business has never seen it and has not
  //                dismissed it. `business_settings.setup.seen` is written by
  //                the form itself on the way in, and the migration that
  //                added the column marked every business that already
  //                existed as seen: first run has already happened for them,
  //                and a form that ambushed an established detailer would be
  //                the opposite of what it is for.
  //   THE TOUR     STAFF GET THE WALKTHROUGH AND NOT THE FORM (§13b) — they
  //                are not setting up a business, and the database refuses
  //                them most of those writes. For an owner the tour follows
  //                the form rather than racing it (see onClose below).
  //
  // The tour's "have you seen this" is a fact about this DEVICE, not this
  // business — two people share one owner login on this trade's tablets, and
  // BusinessContext keeps the preferred business the same way.
  const started = useRef(false);
  // WHETHER THE FORM OPENED BY ITSELF. The tour follows the form ONLY on a
  // genuine first run — a detailer who taps "Finish setting up" on Business
  // six weeks later and closes it again must not be ambushed by a tour they
  // did not ask for. Found by the sweep, which opens the form from that row
  // and was then unable to click anything: the tour's backdrop was over it.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!business || started.current) return;
    started.current = true;
    if (role === "owner") {
      if (settings && !settings.setup?.seen && !settings.setup?.dismissed) {
        autoOpened.current = true;
        setFirstRun("setup");
      }
    } else if (!tourSeen()) setFirstRun("tour");
  }, [business, settings, role]);

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
  // ROADMAP 2.13 MADE THIS A TICK RATHER THAN A ROLE. It used to be a fixed
  // STAFF_HIDDEN set, which was right while there were exactly two roles; a
  // detailer now names the role and chooses its list, so the question each
  // tab asks is what it OPENS. Money needs the money permission (expenses is
  // that tab and the database returns none without it) and Business needs
  // settings (every row on it saves to business_settings, branding or the
  // business itself, and without the permission the SELECT returns nothing
  // either — the screen would be a page of blanks that refuses every save).
  // Three rail buttons was what the OLD rule produced for staff; it is now
  // what an unticked membership produces, and a detailer can hand back
  // either tab by ticking. What is left when both go is behind the gear.
  const TAB_NEEDS = { money: "money", business: "settings" };
  const visibleTabs = TABS.filter((t) => !TAB_NEEDS[t.key] || can(TAB_NEEDS[t.key]));
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
          <button className="btn icon ghost" aria-label="New booking" data-tour="new"
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
        {/* THE SETUP FORM TAKES THE MAIN AREA, exactly as the gear does, and
            for the same reason: it is a place you go, not a thing floating
            over the place you were. It outranks the gear because it is only
            ever on screen when the detailer put it there. */}
        {firstRun === "setup"
          ? (
            <SetupForm onClose={() => {
              setFirstRun(autoOpened.current && !tourSeen() ? "tour" : null);
              autoOpened.current = false;
            }} />
          )
          : gear
            ? <GearMenu onClose={() => setGear(false)} onTour={() => { setGear(false); setFirstRun("tour"); }} />
            : (
              <Active refreshKey={rev} onSetup={() => setFirstRun("setup")} intent={intent}
                onGo={(t, why = null) => { setTab(t); setIntent(why); setGear(false); }} />
            )}
      </main>
      <nav className="tabbar">
        {visibleTabs.map((t) => (
          /* A TAB IS ONLY LIT WHEN IT IS WHAT YOU ARE LOOKING AT. With the
             gear open the main area is the gear, so no tab is current — a lit
             Today over a settings screen is the shell saying where you are
             not. Pressing any tab is also the way out of the gear.
             THE SETUP FORM IS THE SAME KIND OF THING and takes the same main
             area, so the same two rules apply to it: nothing is lit while it
             is up, and a tab press leaves it. Skippable at any point (§13a)
             has to include the bar that is already on the screen. */
          <button key={t.key} data-tour={t.key}
            className={!gear && firstRun !== "setup" && activeTab.key === t.key ? "active" : ""}
            onClick={() => {
              setTab(t.key); setGear(false); setIntent(null);
              if (firstRun === "setup") setFirstRun(null);
            }}>
            <t.Icon size={21} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </nav>
      {creating && (
        <NewBookingModal onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setRev((r) => r + 1); }} />
      )}
      {/* OVER the shell rather than inside it, because the shell is one of the
          things it points at — three of its seven targets are rail buttons.
          It never returns on its own: closing writes this device down as
          shown, and the only other door is the gear. */}
      {firstRun === "tour" && (
        <Walkthrough
          onGo={(t) => { setTab(t); setGear(false); }}
          onClose={() => { markTourSeen(); setFirstRun(null); }} />
      )}
    </div>
  );
}
