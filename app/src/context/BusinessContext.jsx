// Session + tenant context for the whole dashboard. After sign-in, the
// user's business comes from their business_users membership — everything on
// screen (brand name included) is that business's own data, never hardcoded.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { can as canDo } from "../lib/permissions.js";
import { applyDashboardAccent } from "../lib/theme.js";
import { endImpersonation } from "../lib/impersonation.js";
import {
  endParkedSessions, endSessionLocally, forget, listAccounts, parkCurrent, takeAccount,
} from "../lib/accounts.js";
import { signOutEverything } from "../lib/signout.js";

// WHICH BUSINESS THIS BROWSER LAST CHOSE. localStorage rather than the
// database: it is a fact about this DEVICE, not about the account — the same
// person can have the van's tablet on one business and their laptop on the
// other, and a server-side "current business" would fight them for it.
// lib/platform.js keeps this device's other preferences the same way.
const PREFERRED_KEY = "dp.business";
const readPreferred = () => { try { return localStorage.getItem(PREFERRED_KEY); } catch { return null; } };

const Ctx = createContext(null);
export const useBusiness = () => useContext(Ctx);

export function BusinessProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [branding, setBranding] = useState(null);
  const [subscription, setSubscription] = useState(null);
  // ROADMAP 3.3 — the origin a CUSTOMER sees, which is not the one this
  // dashboard is served from: a detailer signs in at detailingplatform.com
  // whatever address their booking page answers on.
  const [siteOrigin, setSiteOrigin] = useState("");
  // ROADMAP 9.3 — has this business answered the website brief? One row, read
  // here with the other five rather than fetched by every screen that asks:
  // App decides whether to open the form, the form itself resumes from it, and
  // Business draws a row from it. Three lookups for one fact is three ways for
  // two screens to disagree.
  const [siteIntake, setSiteIntake] = useState(null);
  const [role, setRole] = useState(null);
  // ROLE IS STILL THE GATE; THESE TWO ARE ITS SHAPE (roadmap 2.13). `owner`
  // means everything and carries neither. Anyone else has the name their
  // business gave them and the list it ticked.
  const [label, setLabel] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState(null);
  // EVERY MEMBERSHIP, NOT JUST THE FIRST — roadmap 2.11 step 6, stage 6.
  // `memberships?.[0]` with a comment saying "multi-business switching comes
  // later" is what made `Switch business` a new door rather than a moved
  // one: the database has supported an account belonging to two businesses
  // since the staff-roles migration, and the front end could only ever open
  // whichever one came back first.
  const [memberships, setMemberships] = useState([]);

  useEffect(() => {
    // ROADMAP 8.18 — **THE LIVE ACCOUNT IS NEVER ALSO IN THE PARK.** No path
    // here puts it there, but one can leave it: a tab closed between parking
    // the session and signing the next person in. A live account on its own
    // switcher is a row that switches to itself, so this heals it on sight
    // rather than every reader having to filter.
    const settle = (s) => { if (s?.user?.id) forget(s.user.id); setSession(s ?? null); };
    supabase.auth.getSession().then(({ data }) => settle(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => settle(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Every "there is no tenant" exit clears ALL of the tenant's state, not just
  // `business`. Both exits below used to clear only that, leaving branding,
  // settings, role and firstName from the previous session behind. That was
  // invisible until the dashboard started wearing the tenant's accent colour
  // (law 11, 2026-08-30): a stale `branding` meant signing out left the last
  // detailer's colour painted on the sign-in screen, and signing in as a
  // different one wore their predecessor's colour until the fetch returned.
  const clearTenant = () => {
    setBusiness(null);
    setMemberships([]);
    setSiteIntake(null);
    setSettings(null);
    setBranding(null);
    setSubscription(null);
    setRole(null);
    setLabel(null);
    setPermissions([]);
    setFirstName(null);
  };

  // WHICH USER WE HAVE ALREADY LOADED. `loading` means "we do not know who
  // the tenant is yet" — it does NOT mean "a refetch is in flight", and the
  // difference is visible: App.jsx renders a full-screen spinner while it is
  // true, which unmounts every screen underneath. So every settings screen
  // that called reload() after a save threw the detailer out of the sheet they
  // were in and back to the More list. Found in roadmap 2.8b while building
  // the vehicle-size editor, which writes on every arrow press and made a
  // pre-existing wart unusable; fixed here rather than in each caller, because
  // there are six of them and they all have the same bug.
  // Keyed on the user id, not a bare boolean: a DIFFERENT user signing in has
  // to show the spinner, or the new tenant briefly wears the old one's data.
  const loadedFor = useRef(null);

  const reload = useCallback(async () => {
    if (!session?.user) {
      clearTenant();
      loadedFor.current = null;
      setLoading(false);
      return;
    }
    if (loadedFor.current !== session.user.id) setLoading(true);
    const { data: memberships } = await supabase
      .from("business_users")
      // `businesses(name)` joins in the NAME so the picker has something to
      // print without a second read. Harmless for the one-membership case.
      .select("business_id, role, label, permissions, first_name, businesses(name)")
      .eq("user_id", session.user.id);
    const list = memberships ?? [];
    setMemberships(list);
    // The one they last chose, if they still belong to it. Anything else —
    // a stale id, an account they were removed from, a first sign-in — falls
    // back to the first, which is what this line always did.
    const wanted = readPreferred();
    const membership = list.find((m) => m.business_id === wanted) ?? list[0] ?? null;
    if (!membership) {
      clearTenant();
      setLoading(false);
      return;
    }
    setRole(membership.role);
    setLabel(membership.label || null);
    setPermissions(membership.permissions ?? []);
    setFirstName(membership.first_name || null);
    // ROADMAP 2.20 STAGE 2 — the subscription joins the three reads that were
    // already happening rather than becoming a fourth query on the busiest
    // screen. TWO places need it and neither of them is the billing screen:
    // the gear row's own summary, and the warning Today draws when a card has
    // stopped working. A screen that had to fetch it itself would be a screen
    // that fetches it on every tab press.
    //
    // ONLY AN OWNER CAN SEE THE ROW — the policy is `is_business_owner` — so
    // for anybody else this is `null` and every reader treats that as "nothing
    // to say", which is exactly right: a staff member is not the person whose
    // card it is.
    const [bizRes, setRes, brandRes, subRes, domRes, intakeRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", membership.business_id).single(),
      supabase.from("business_settings").select("*").eq("business_id", membership.business_id).maybeSingle(),
      supabase.from("business_branding").select("*").eq("business_id", membership.business_id).maybeSingle(),
      membership.role === "owner"
        ? supabase.from("platform_subscriptions")
          .select("status, recurring_cents, bill_interval, current_period_end, cancel_at_period_end")
          .eq("business_id", membership.business_id).maybeSingle()
        : Promise.resolve({ data: null }),
      // ROADMAP 3.3 — the detailer's own verified address, if they have one.
      // HERE rather than in the four screens that draw a booking link: it is
      // one fact, and four lookups for one fact is four ways for two screens
      // to disagree about which domain a customer sees. Ordered the same way
      // `business_canonical_host` orders, which is what the EMAILS use — a
      // link on a card that named a different one of two verified domains
      // than the confirmation email does would be worse than neither.
      supabase.from("business_domains").select("domain")
        .eq("business_id", membership.business_id)
        .not("verified_at", "is", null).order("created_at").limit(1),
      // ROADMAP 9.3. Only the columns anybody outside the form needs — the
      // answers themselves are a large jsonb and are read by the form alone.
      supabase.from("site_intake").select("step, submitted_at, dismissed")
        .eq("business_id", membership.business_id).maybeSingle(),
    ]);
    setBusiness(bizRes.data ?? null);
    setSettings(setRes.data ?? null);
    setBranding(brandRes.data ?? null);
    setSubscription(subRes.data ?? null);
    setSiteOrigin(domRes.data?.[0]?.domain ? `https://${domRes.data[0].domain}` : "");
    setSiteIntake(intakeRes.data ?? null);
    loadedFor.current = session.user.id;
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session !== undefined) reload();
  }, [session, reload]);

  // THE TENANT'S ACCENT, ON THEIR OWN DASHBOARD — design-system law 11, as
  // the owner rewrote it on 2026-08-30. Half of the old theme effect is still
  // gone for good: there is no light/dark preference to read and no data-theme
  // to set, because there is one ground. The colour half is back.
  //
  // Runs on mount, on every change to branding.primary_color, and with null
  // on unmount — the unmount call is not tidiness. theme.css is a GLOBAL
  // stylesheet, so a colour left on <html> would follow the user out to the
  // public marketing page, which has no --accent* of its own. This provider
  // wraps only the signed-in routes, so unmounting IS leaving the dashboard.
  useEffect(() => {
    applyDashboardAccent(branding?.primary_color || null);
    return () => applyDashboardAccent(null);
  }, [branding?.primary_color]);

  const value = {
    session,
    business,
    settings,
    branding,
    // ROADMAP 3.3. An empty string for every business without a verified
    // address of its own, which is all of them today — and every reader
    // treats that as "use the platform's", so nothing had to learn about it.
    siteOrigin,
    // Null for a staff member and for an owner who has never subscribed. Both
    // mean "draw nothing", which is why no reader has to tell them apart.
    subscription,
    // ROADMAP 9.3. Null means nobody has opened the website brief, which is a
    // different thing from an empty draft — so the form can be offered once
    // and never again after it is sent or waved away.
    siteIntake,
    role,
    label,
    permissions,
    // The one question every screen actually asks. Bound here rather than
    // imported at each call site so nothing can check a permission without
    // this session's own list.
    can: (key) => canDo(role, permissions, key),
    firstName,
    memberships,
    // Switching is a WRITE TO THIS DEVICE and then a reload — there is no
    // server-side notion of a current business, and adding one would put the
    // same fact in two places. reload() re-reads the list and picks the
    // stored id, so every screen follows without knowing this exists.
    switchBusiness: (id) => {
      try { localStorage.setItem(PREFERRED_KEY, id); } catch { /* private mode */ }
      // A different tenant: show the spinner rather than wear the last
      // one's name and colour until the fetch lands.
      loadedFor.current = null;
      return reload();
    },
    // ── ROADMAP 8.18 — TWO LOGINS AT ONCE ──────────────────────────────
    //
    // *"Maybe there's an account switcher — like how on Chrome you could log
    // into multiple Google accounts and switch between accounts."* Two
    // separate PEOPLE, both signed in. `switchBusiness` above is the other
    // thing entirely: the memberships of ONE person.
    //
    // `lib/accounts.js` holds the reasoning and the two rules that are
    // security rather than convenience. The short version is here because it
    // is the call sites that get them wrong:
    //   · adding an account NEVER calls `signOut` — no scope does what parking
    //     needs, and every one of them POSTs `/logout`. The module says why,
    //     and it cost a rebuild to find out;
    //   · signing out empties the park FIRST, so a failed network call cannot
    //     leave another account reachable from a button that says Sign out.
    accounts: listAccounts(),
    addAccount: async () => {
      const { data } = await supabase.auth.getSession();
      parkCurrent(data.session, readPreferred());
      endImpersonation();
      // A RELOAD RATHER THAN A STATE CHANGE, because the client holds the
      // session in memory as well as in storage — dropping the entry under a
      // live client leaves it signed in until something makes it read again.
      // The reload is also what the honest fallback needs, so both paths end
      // the same way.
      if (endSessionLocally()) { window.location.assign("/app"); return; }
      // COULD NOT FIND THE ENTRY — a supabase-js shape change, or a browser
      // that will not let us read the keys. Take the exit that leaves nothing
      // dangling: every session ended, everywhere. Somebody typing a password
      // again is a worse morning than a hole.
      await signOutEverything();
    },
    // Returns null on success, or a sentence to show. A parked session can be
    // dead for reasons nothing here can see — the password was changed, the
    // session was revoked from another device — and the honest answer is to
    // drop it and ask for the password again, never to leave a name on the
    // list that cannot be pressed.
    useAccount: async (userId) => {
      const parked = takeAccount(userId);
      if (!parked) return "That account is no longer signed in on this device.";
      const { data } = await supabase.auth.getSession();
      parkCurrent(data.session, readPreferred());
      endImpersonation();
      const { error } = await supabase.auth.setSession({
        access_token: parked.access_token,
        refresh_token: parked.refresh_token,
      });
      if (error) {
        return `${parked.email || "That account"} has to sign in again.`;
      }
      // THE ACCOUNT THAT IS NOW LIVE MUST NOT ALSO BE IN THE PARK. It cannot
      // be by this path, but it can by others — a tab closed halfway through
      // adding an account, for one — and a live account on its own switcher
      // is a row that switches to itself.
      forget(userId);
      // The chosen business is a fact about this DEVICE, so it is parked with
      // the account and put back with it; without this a switch lands on
      // whichever membership the query happens to return first.
      try {
        if (parked.business) localStorage.setItem(PREFERRED_KEY, parked.business);
        else localStorage.removeItem(PREFERRED_KEY);
      } catch { /* private mode */ }
      loadedFor.current = null;
      return null;
    },
    loading: session === undefined || loading,
    reload,
    // **EVERY SIGN-OUT DROPS THE IMPERSONATION NOTE, not just the two the
    // back office draws.** Roadmap 8.2: the note is a fact about the session
    // in this browser, so it has to die with the session — and the ordinary
    // gear sign-out is the exit somebody actually takes when they have
    // forgotten they are impersonating. Left behind, it is a note asserting
    // something that stopped being true, which is the one state
    // `lib/impersonation.js` is written to make impossible.
    // **ONE DOOR, AND IT ENDS THE PARKED SESSIONS AT THE SERVER RATHER THAN
    // JUST FORGETTING THEM.** `lib/signout.js` has why — the first version of
    // roadmap 8.18 only emptied the park locally, which left every parked
    // refresh token valid for ever behind a button that says Sign out.
    signOut: signOutEverything,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
