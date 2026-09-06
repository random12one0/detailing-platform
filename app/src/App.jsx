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
import Walkthrough, { TOURS } from "./components/Walkthrough.jsx";

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
// ROADMAP 2.24 — ONE KEY HOLDING A LIST OF NAMES, not five keys.
//
// Five would be five things to clear, and a detailer who wanted the guides
// again would have to know all five names. One means *Show me around* can
// offer "start again" and mean it. The old single key is still read on the
// way in, so a browser that has already seen the shell tour is not shown it
// twice the day this ships.
const TOUR_KEY = "dp.tour";
const TOURS_KEY = "dp.tours";
const seenTours = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(TOURS_KEY) || "[]");
    const list = Array.isArray(raw) ? raw : [];
    return localStorage.getItem(TOUR_KEY) ? [...new Set([...list, "shell"])] : list;
  } catch { return []; }
};
const markTourSeen = (name = "shell") => {
  try {
    localStorage.setItem(TOURS_KEY, JSON.stringify([...new Set([...seenTours(), name])]));
    if (name === "shell") localStorage.setItem(TOUR_KEY, "1");
  } catch { /* private mode */ }
};
const tourSeen = (name = "shell") => seenTours().includes(name);

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
  // ROADMAP 2.20 STAGE 2 — `?settings=billing`. The ONE deep link into the
  // settings half of this shell, and it exists because /pricing → signup →
  // dashboard is three screens between choosing a plan and paying for it: a
  // detailer who lands on Today after all that has to find a gear, a row and a
  // rung again, having already chosen. Read ONCE, at mount, so pressing the
  // gear afterwards behaves normally.
  const deepLink = useRef(new URLSearchParams(window.location.search).get("settings"));
  const [gear, setGear] = useState(() => deepLink.current === "billing");
  // WHICH settings screen the gear should land on, when something sent the
  // detailer there rather than them pressing the gear. Today's past-due box is
  // the only sender today; `key` on GearMenu turns it into a fresh mount, so
  // the row opens without the menu having to accept a controlled `open` prop
  // it does not otherwise need.
  const [gearScreen, setGearScreen] = useState(() =>
    deepLink.current === "billing" ? "billing" : null);
  // FIRST RUN — ONE STATE, TWO SEPARATE THINGS (screen designs §13, and the
  // owner kept them two on purpose). "setup" is the stepped form, "tour" is
  // the walkthrough; neither is a mode the shell has to know anything else
  // about, so one nullable string holds both.
  const [firstRun, setFirstRun] = useState(null);
  // ROADMAP 2.24 — which TAB guide is on screen, separate from `firstRun`
  // because they are different lifetimes: the first run happens once ever,
  // and a tab guide happens once per tab and can arrive months later.
  const [tabTour, setTabTour] = useState(null);
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
    // WAIT FOR WHAT THE DECISION NEEDS, AND ONLY FOR THAT. An owner's branch
    // reads `settings`; a staff member may never be allowed to (Notifications
    // needs the `settings` permission to READ it), so gating both on it would
    // take the tour away from the people most likely to be new. The latch was
    // set before this check until 2026-09-06: a settings fetch that answered
    // one tick after the business did meant an owner got NO first run at all,
    // silently and only sometimes.
    if (role === "owner" && !settings) return;
    started.current = true;
    if (role === "owner") {
      // ROADMAP 7.3's FINAL PASS, finding 2, fixed 2026-09-06 — but in
      // `SetupForm`, not here. `setup.seen` used to be written when the form
      // MOUNTED, so tapping a rail button in the first ten seconds dismissed
      // the form, marked it seen and lost the tour with it, for ever. It is
      // written when the form CLOSES now, which is what the mount-write was
      // reaching for anyway: a form that was FINISHED must not reopen
      // tomorrow, and one that was walked away from is not finished.
      if (!settings.setup?.seen && !settings.setup?.dismissed) {
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
            aria-pressed={gear} onClick={() => { setGearScreen(null); setGear((g) => !g); }}>
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
            ? (
              <GearMenu
                key={gearScreen ?? "index"}
                initial={gearScreen}
                onClose={() => setGear(false)}
                onTour={() => { setGear(false); setFirstRun("tour"); }}
              />
            )
            : (
              <Active refreshKey={rev} onSetup={() => setFirstRun("setup")} intent={intent}
                onGo={(t, why = null) => {
                  // ROADMAP 2.20 STAGE 2 — "billing" is the one destination
                  // that is a SETTINGS SCREEN rather than a tab. Today's
                  // past-due box is what sends it, and a box that names the
                  // fix has to be able to reach it.
                  if (t === "billing") { setGearScreen("billing"); setGear(true); return; }
                  setTab(t); setIntent(why); setGear(false);
                }} />
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
              // ROADMAP 2.24 — the guide for a tab arrives the first time
              // this browser opens it, and only then.
              //
              // **NEVER WHILE ANOTHER TOUR IS ON SCREEN.** The shell tour's
              // own steps move tabs, so without this the first move would put
              // a second overlay on top of the first — and the setup form is
              // the same problem one screen earlier.
              //
              // The plan is worked out by `Walkthrough` itself, which drops a
              // step whose target is absent — so a guide is only STARTED here
              // and its length is decided there.
              // AND NOT ON THE SAME TICK AS THE TAB PRESS. The tour works out
              // its plan when it MOUNTS — dropping any step whose target is
              // absent — and a screen that has just been switched to has not
              // finished its own read yet. **Measured: Today planned "1 of 1"
              // on a dashboard with two waiting requests and a finished job**,
              // because neither block was drawn when the tour counted. Also
              // the kinder order: an overlay on a still-loading screen is
              // pointing at a spinner.
              // NOT `!gear`. Pressing a tab is how you LEAVE the gear — the
              // line above sets it false — so reading it here reads the state
              // the press is ending, and a detailer whose first visit to
              // Clients came from the settings screen got no guide at all.
              // `firstRun` is the one that has to be checked from before,
              // because a guide arriving the instant the setup form is
              // dismissed is the two-overlays problem this guard exists for.
              if (!firstRun && TOURS[t.key] && !tourSeen(t.key)) {
                setTimeout(() => setTabTour((cur) => cur ?? t.key), 900);
              }
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
          onClose={() => { markTourSeen("shell"); setFirstRun(null); }} />
      )}
      {/* ROADMAP 2.24 — a tab's own guide. `key` so switching tabs while one
          is up remounts rather than re-plans, and `onGo` is absent: a tab
          guide is already on the screen it is about. */}
      {!firstRun && tabTour && (
        <Walkthrough key={tabTour} tour={tabTour}
          // NOT MARKED SEEN when it leaves for want of steps — decision 6.
          // A detailer whose Today is empty today gets the guide the first
          // day there is a job on it.
          onEmpty={() => setTabTour(null)}
          onClose={() => { markTourSeen(tabTour); setTabTour(null); }} />
      )}
    </div>
  );
}
