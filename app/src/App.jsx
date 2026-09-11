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
import SiteIntake from "./screens/SiteIntake.jsx";
import { SCREENS } from "./screens/more/index.js";
import Walkthrough, { TOURS, GRAND } from "./components/Walkthrough.jsx";
import { impersonation } from "./lib/impersonation.js";
import { isPreviewTab, previewMode, previewWho, setPreviewMode } from "./lib/preview.js";
import { planChoice } from "./lib/planChoice.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD scope (`dp.lang.app`), never the
// booking page's. See `lib/appI18n.js` for why they are two keys.
import { t } from "./lib/appI18n.js";
import { useAppLocale } from "./hooks/useAppLocale.js";

// THE FIVE NAMES THE DASHBOARD ANSWERS TO, exported for the router.
//
// **App itself reads NO part of the URL** — the tabs are state, so `/app/today`
// and `/app/anything` render an identical screen. That was harmless until the
// bare catch-all became a 404 page: without this list `/app/nonsense` would be
// the one address left in the product that silently pretends to exist.
// Derived from TABS rather than typed again, or a sixth tab would be a 404.
export const TAB_PATHS = ["today", "calendar", "money", "clients", "business"];

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
  const { session, business, settings, role, can, loading, signOut, reload,
    subscription, siteIntake } = useBusiness();

  // The whole shell repaints when the language changes. Every screen calls
  // this for itself too — see the hook's header on why once at the root is
  // the version that breaks silently.
  useAppLocale();
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
  // **AND A PLAN CHOSEN ON `/pricing` IS THE SAME DEEP LINK — roadmap 8.3.**
  // It used to read `?settings` and nothing else, so a detailer who was
  // ALREADY SIGNED IN and pressed a rung on the pricing page arrived here with
  // `?plan=website&term=annual-upfront` in the address bar and landed on
  // Today, the entire choice discarded. Signing up carried it (through
  // `CreateBusiness`); having an account already did not — the one case
  // nobody walks, because whoever is testing has just made an account.
  // Reproduced before it was fixed, at 392, on the seeded demo.
  const deepLink = useRef(
    new URLSearchParams(window.location.search).get("settings")
    || (planChoice(window.location.search) ? "billing" : null),
  );
  // **EVERY SETTINGS SCREEN HAS AN ADDRESS NOW, and until 2026-09-10 only one
  // did.** `?settings=<key>` was read and then thrown away for every value
  // except `billing`, so twenty screens were reachable only by tapping through
  // the gear — which is exactly why his own map page lists them under "what you
  // have not looked at yet". A screen nobody can link to is a screen nobody
  // reviews. The key is checked against the registry rather than trusted, so a
  // typed or stale link opens the menu instead of a blank panel. */
  const deepScreen = deepLink.current && SCREENS[deepLink.current] ? deepLink.current : null;
  const [gear, setGear] = useState(() => deepLink.current === "billing" || !!deepScreen);
  // WHICH settings screen the gear should land on, when something sent the
  // detailer there rather than them pressing the gear. Today's past-due box is
  // the only sender today; `key` on GearMenu turns it into a fresh mount, so
  // the row opens without the menu having to accept a controlled `open` prop
  // it does not otherwise need.
  const [gearScreen, setGearScreen] = useState(() =>
    (deepLink.current === "billing" ? "billing" : deepScreen));
  // ROADMAP 2.20 STAGE 3 — THE SECOND DEEP LINK, AND IT LANDS ON BUSINESS
  // RATHER THAN ON THE GEAR, because "How you get paid" is a Business row.
  // Stripe sends a detailer back to `/settings/payments/connected` with the
  // consent code on it; `main.jsx` forwards that here as
  // `?settings=payments&code=…&state=…` and this is what puts the screen the
  // code belongs to on the screen. Without it they land on Today holding a
  // single-use code that nothing reads, and the connection silently does not
  // happen.
  //
  // STATE RATHER THAN THE REF, and that is the whole difference: `Business`
  // unmounts when a tab changes, so a ref would re-open the payments screen
  // every time the detailer came back to that tab for the rest of the
  // session. Cleared by any tab press below, like `intent`.
  const [bizScreen, setBizScreen] = useState(() =>
    deepLink.current === "payments" ? "payments" : null);
  // FIRST RUN — ONE STATE, TWO SEPARATE THINGS (screen designs §13, and the
  // owner kept them two on purpose). "setup" is the stepped form, "tour" is
  // the walkthrough; neither is a mode the shell has to know anything else
  // about, so one nullable string holds both.
  // ROADMAP 9.3 — `/website` is the address the owner sends a detailer, and it
  // lands here with `?brief=1`. A route of its own would be the same screen
  // without the shell around it; this is a place INSIDE the dashboard they are
  // already signed in to, which is the whole reason the form can skip every
  // question the product already knows the answer to.
  // TWO ADDRESSES THAT OPEN A FORM DIRECTLY. `?brief=1` is the website brief;
  // `?setup=1` is first-run setup, which the master map has advertised since
  // it was written and which was never actually wired — the link opened the
  // dashboard and nothing else, so the one way to see that form was to be a
  // business that had never seen it. A screen only reachable by being new is a
  // screen nobody can review.
  const [firstRun, setFirstRun] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("brief") === "1") return "website";
    if (q.get("setup") === "1") return "setup";
    return null;
  });
  // WHETHER THE ADDRESS ASKED FOR ONE OF THEM. A ref rather than reading the
  // URL again in the effect below, because `SiteIntake` and `SetupForm` both
  // clear the query as they close and the effect would then stop believing it
  // was ever asked. Read once, at the same moment `firstRun` is.
  const fromUrl = useRef(
    new URLSearchParams(window.location.search).get("setup") === "1"
    || new URLSearchParams(window.location.search).get("brief") === "1",
  );
  // ROADMAP 2.24 — which TAB guide is on screen, separate from `firstRun`
  // because they are different lifetimes: the first run happens once ever,
  // and a tab guide happens once per tab and can arrive months later.
  const [tabTour, setTabTour] = useState(null);
  // Whether the guide on screen was ASKED FOR or arrived by itself. The two
  // deserve different behaviour when there is nothing to point at.
  const asked = useRef(false);
  const [tab, setTab] = useState(deepLink.current === "payments" ? "business" : "today");
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
  // A PREVIEW TAB SAYS SO, AND STARTS UNABLE TO CHANGE ANYTHING. This is the
  // owner looking at a detailer's dashboard from a tab of his own, with his
  // back office still signed in next door (lib/preview.js). Nothing is
  // hidden — he asked for that explicitly — the writes simply refuse until
  // he flips the switch, so a stray click cannot finalise somebody's payment.
  const [mode, setMode] = useState(previewMode());

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
  // WHO IS ASKED FOR A WEBSITE BRIEF: an owner who is PAYING, and only until
  // they have sent it or waved it away. A detailer on no plan is not getting a
  // site built, so asking them 79 questions would be a form with nothing at
  // the end of it. `siteIntake` is null until somebody opens the form, which
  // is why "never opened" and "opened and left" are different states.
  const wantsBrief = role === "owner"
    && ["active", "trialing", "past_due"].includes(subscription?.status)
    && !siteIntake?.submitted_at && !siteIntake?.dismissed;

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
    // A PENDING BILLING LINK OUTRANKS THE FIRST RUN — testing loop F-003,
    // 2026-09-06. `CreateBusiness` sends a detailer who chose a plan to
    // `/app?settings=billing&term=…`, and the gear below does open on
    // billing — and then this effect opened the setup form ON TOP of it, and
    // the tour on top of that. Closing both leaves them on Today with the
    // URL still saying `settings=billing`, `platform_subscriptions` empty,
    // and NOTHING on any screen saying so: Today warns on `past_due` and
    // `suspended`, never on "never subscribed". So somebody who picked a
    // plan, read the terms and pressed Choose this arrives at a free product
    // and is never asked again.
    //
    // Deferring rather than cancelling: `setup.seen` is written by the form
    // when it CLOSES, so a form that never opened is not marked, and the
    // next load offers it. Pay first, set up second — which is also the
    // order they chose.
    // ANY deep link, not only billing. This read `=== "billing"` until
    // roadmap 2.20 stage 3 added a second one, and the bug it was written to
    // fix would have come straight back: the setup form opening on top of a
    // returning Stripe consent, then the tour on top of that, leaves the
    // detailer on Today with a spent code and no connection.
    if (deepLink.current) return;
    // **AND `?setup=1` OUTRANKS IT FOR THE SAME REASON — 2026-09-11.** The
    // param is read into `firstRun`'s initial state above, and then this
    // effect ran and overwrote it: on a business that has already SEEN setup
    // the first branch is false, `wantsBrief` is true, and the website brief
    // opened instead. So the one address on the master map for reviewing the
    // first-run form silently showed a different form, and it did it only on a
    // business that had seen setup — which is every business anybody would use
    // to review it.
    //
    // That is the exact defect the param was added to fix. Its own comment
    // twenty lines up says *"a screen only reachable by being new is a screen
    // nobody can review"*, and this effect had quietly put it back.
    //
    // Found by trying to open it, 2026-09-11. Nothing reported anything: the
    // brief wears the setup form's chrome (`.setupform`, `.setupfoot`, the
    // progress rule), so the wrong screen looks like the right one until you
    // read the buttons on it.
    if (fromUrl.current) return;
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
      } else if (wantsBrief) {
        // ROADMAP 9.3 — the owner, 2026-09-09: *"as soon as they sign up and
        // pay… it shows this, that way I have all the information to get
        // their website built."* AFTER the setup form, never instead of it:
        // setup is what makes them bookable and this is what makes them a
        // website, and the second is worth nothing without the first.
        autoOpened.current = true;
        setFirstRun("website");
      }
    } else if (!tourSeen()) setFirstRun("tour");
  }, [business, settings, role, wantsBrief]);

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
  const visibleTabs = TABS.filter((x) => !TAB_NEEDS[x.key] || can(TAB_NEEDS[x.key]));
  const activeTab = visibleTabs.find((x) => x.key === tab) ?? visibleTabs[0];
  const Active = activeTab.el;
  // Null for every real detailer, on every render, at the cost of one
  // localStorage read — so there is no state, no effect and nothing to keep
  // in step. It is checked against the LIVE session's address, which is what
  // makes a note left behind by a previous sign-in impossible to believe.
  const imp = impersonation(session?.user?.email);

  return (
    <div className="app-shell">
      {/* THE DOT LATTICE — a real element rather than a third pseudo-element,
          because `.app-shell` has only `::before` and `::after` and both are
          spent (the two lights, and the grain). It draws nothing interactive
          and reads nothing; `aria-hidden` keeps it out of the tree entirely.
          theme.css § the dot lattice has the reasoning and the measurements. */}
      <div className="app-dots" aria-hidden="true" />
      {/* YOU ARE NOT YOURSELF — roadmap 8.2. The back office's *Open their
          dashboard* swaps this browser's session for the detailer's, and
          until this strip existed it did so in total silence: the same
          chrome, the same tabs, somebody else's customers and money, and
          every switch you touch theirs. That is the half of the owner's
          *"it just kinda logged me in without doing anything"* that lives
          out here rather than at /admin.

          It renders from a note the back office wrote in THIS browser, and
          only while the signed-in address is the one that note names — see
          `lib/impersonation.js`. A detailer can never see it: nothing has
          written the note in their browser, and forging one would only make
          their own screen say something untrue. */}
      {isPreviewTab && (
        <div className="impbar" role="status">
          <span>
            {mode === "look"
              ? `Looking at ${previewWho() || "their dashboard"}. Nothing here can be changed.`
              : `WORKING in ${previewWho() || "their dashboard"}. Anything you change is theirs.`}
          </span>
          <button type="button" onClick={() => {
            const next = mode === "look" ? "work" : "look";
            setPreviewMode(next); setMode(next);
          }}>{mode === "look" ? "Let me make changes" : "Back to looking"}</button>
          {/* Closing the tab IS the exit — the session lives in this tab and
              the browser throws it away. Nothing to sign out of. */}
          <button type="button" onClick={() => window.close()}>Close</button>
        </div>
      )}
      {!isPreviewTab && imp && (
        <div className="impbar" role="status">
          <span>{t("Platform view — signed in as {who}. Anything you change is theirs.", { who: imp.business || imp.as })}</span>
          {/* `signOut` drops the note itself — every sign-out does, not just
              this one, because the ordinary gear sign-out is the exit
              somebody takes when they have forgotten they are impersonating.
              See BusinessContext. */}
          <button type="button" onClick={async () => {
            await signOut();
            window.location.href = "/admin";
          }}>{t("Leave")}</button>
        </div>
      )}
      <header className="topbar">
        {/* The business's own name from the database — never a hardcoded brand. */}
        <div className="brand">{business.name}</div>
        {/* The screen's NAME used to sit here, which made three copies of it
            on one phone: the lit tab, this, and the screen's own masthead.
            docs/dashboard-phone-pass-2026-08-31.md §2d. */}
        <div className="row" style={{ gap: 4 }}>
          <button className="btn icon ghost" aria-label={t("New booking")} data-tour="new"
            onClick={() => setCreating(true)}>
            <Plus strokeWidth={2} />
          </button>
          {/* The plumbing. It is pressed to go in and pressed again to come
              back out, which is why it is aria-pressed rather than a link. */}
          {/* data-tour — the whole-dashboard tour's last block presses this
              to open the settings and then points at what is inside. */}
          <button data-tour="gear" className={`btn icon ghost${gear ? " on" : ""}`} aria-label="Settings"
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
        {firstRun === "website"
          ? <SiteIntake onClose={() => { setFirstRun(null); autoOpened.current = false; reload(); }} />
          : firstRun === "setup"
          ? (
            <SetupForm onClose={() => {
              setFirstRun(autoOpened.current && !tourSeen() ? "tour" : null);
              autoOpened.current = false;
            }} />
          )
          : gear
            ? (
              /* **IT RUNS THE GUIDE FOR THE TAB YOU ARE ON**, and that is
                    his bug 1.3 rather than a preference: *"the today guide
                    goes to the business page. The today guide should only do
                    guides on the today page."* What he pressed was this, and
                    it always ran the SHELL tour, whose last two steps are
                    about the rail and the booking link and therefore live on
                    Business. The shell tour is not wrong — it introduces the
                    rail to somebody who has never seen it — it is just not
                    what "show me around" means once you are standing
                    somewhere.

                    **AND IT MAKES EVERY TAB GUIDE REPLAYABLE**, which is his
                    1.4: *"when I click on Calendar, Money, Clients and
                    Business, I can't view the guides through all of them."*
                    They fired once, automatically, the first time a browser
                    opened each tab, and there was no second chance — so a
                    detailer who tapped past one had lost it for good. */
              <GearMenu
                key={gearScreen ?? "index"}
                initial={gearScreen}
                onClose={() => setGear(false)}
                // **THE WHOLE DASHBOARD, FROM TODAY, WHATEVER TAB YOU PRESSED
                // IT ON — his ruling, 2026-09-10.** It ran the guide for the
                // tab you were standing on, which was yesterday's fix for it
                // wandering off to Business. Right about the wandering, wrong
                // about the scope: *"I want it so when you press the settings,
                // it restarts the tour from the beginning, from the today
                // page... It should do it for every single tab."* The tabs a
                // detailer cannot see are not in it — `Walkthrough` drops a
                // block whose screen has nothing to point at.
                //
                // A `{/* */}` COMMENT BETWEEN ATTRIBUTES IS A SYNTAX ERROR —
                // second time this session. Inside an opening tag the comment
                // form is `//`; the braces one only works between children.
                onTour={() => { setGear(false); asked.current = true; setTabTour("everything"); }}
              />
            )
            : (
              <Active refreshKey={rev} onSetup={() => setFirstRun("setup")} intent={intent}
                // Only `Business` reads it; the other tabs ignore a prop they
                // were not given a use for, which is cheaper than a second
                // render path in this switch for one destination.
                initial={bizScreen}
                onGo={(dest, why = null) => {
                  // ROADMAP 2.20 STAGE 2 — "billing" is the one destination
                  // that is a SETTINGS SCREEN rather than a tab. Today's
                  // past-due box is what sends it, and a box that names the
                  // fix has to be able to reach it.
                  if (dest === "billing") { setGearScreen("billing"); setGear(true); return; }
                  // ROADMAP 8.9 — and the same shape one destination over. The
                  // money screen's "where they came from" block is a REPORT;
                  // the links it reports on are added and edited on Business.
                  // Business reads `initial` at mount and this arrives from
                  // another tab, so it mounts fresh with the screen open.
                  if (dest === "campaigns") { setBizScreen("campaigns"); setTab("business"); setGear(false); return; }
                  setTab(dest); setIntent(why); setGear(false);
                }} />
            )}
      </main>
      <nav className="tabbar">
        {visibleTabs.map((x) => (
          /* A TAB IS ONLY LIT WHEN IT IS WHAT YOU ARE LOOKING AT. With the
             gear open the main area is the gear, so no tab is current — a lit
             Today over a settings screen is the shell saying where you are
             not. Pressing any tab is also the way out of the gear.
             THE SETUP FORM IS THE SAME KIND OF THING and takes the same main
             area, so the same two rules apply to it: nothing is lit while it
             is up, and a tab press leaves it. Skippable at any point (§13a)
             has to include the bar that is already on the screen. */
          <button key={x.key} data-tour={x.key}
            className={!gear && firstRun !== "setup" && activeTab.key === x.key ? "active" : ""}
            onClick={() => {
              setTab(x.key); setGear(false); setIntent(null); setBizScreen(null);
              // **A TAB PRESS CLOSES WHATEVER IS OVER THE MAIN AREA.** This
              // read `=== "setup"`, so the website brief stayed on top: the
              // tab underneath changed and nothing on screen did, which is
              // exactly his *"you click on them and it does nothing… it's a
              // little broken."* The rail is not decoration while a form is
              // open, it is the way out of it.
              if (firstRun) setFirstRun(null);
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
              if (!firstRun && TOURS[x.key] && !tourSeen(x.key)) {
                setTimeout(() => setTabTour((cur) => cur ?? x.key), 900);
              }
            }}>
            <x.Icon size={21} strokeWidth={1.75} />
            {t(x.label)}
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
          onGo={(dest) => { setTab(dest); setGear(false); }}
          onClose={() => { markTourSeen("shell"); setFirstRun(null); }} />
      )}
      {/* ROADMAP 2.24 — a tab's own guide. `key` so switching tabs while one
          is up remounts rather than re-plans, and `onGo` is absent: a tab
          guide is already on the screen it is about. */}
      {!firstRun && tabTour && (
        <Walkthrough key={tabTour} tour={tabTour}
          // **THE WHOLE-DASHBOARD TOUR MOVES TABS AND THEREFORE NEEDS THIS.**
          // A single tab's guide never calls it — its steps carry no
          // destination — so one prop covers both without a condition.
          onGo={(dest) => { setTab(dest); setGear(false); }}
          // NOT MARKED SEEN when it leaves for want of steps — decision 6.
          // A detailer whose Today is empty today gets the guide the first
          // day there is a job on it.
          // **A GUIDE STARTED BY HAND MUST NOT VANISH IN SILENCE.** Decision 6
          // drops a guide with fewer than two targets, which is right when it
          // arrived by itself and wrong when somebody pressed a button for it
          // — that reads as a dead control, which is the shape of the bug he
          // reported one screen over. So the automatic one still leaves
          // quietly, and a requested one falls back to the tour of the rail,
          // which every dashboard can always run.
          onEmpty={() => { if (asked.current) { asked.current = false; setTabTour(null); setFirstRun("tour"); } else setTabTour(null); }}
          // FINISHING THE TOUR OF EVERYTHING MARKS EVERYTHING SEEN, including
          // when it is skipped — otherwise a detailer who has just been shown
          // all five tabs gets each one's guide ambushing them again as they
          // walk the rail, and somebody who pressed Skip gets it five more
          // times. The gear is still the way back in.
          onClose={() => {
            if (tabTour === "everything") [...GRAND, "shell"].forEach(markTourSeen);
            else markTourSeen(tabTour);
            setTabTour(null);
          }} />
      )}
    </div>
  );
}
