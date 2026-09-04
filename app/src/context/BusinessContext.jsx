// Session + tenant context for the whole dashboard. After sign-in, the
// user's business comes from their business_users membership — everything on
// screen (brand name included) is that business's own data, never hardcoded.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { can as canDo } from "../lib/permissions.js";
import { applyDashboardAccent } from "../lib/theme.js";

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
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null));
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
    setSettings(null);
    setBranding(null);
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
    const [bizRes, setRes, brandRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", membership.business_id).single(),
      supabase.from("business_settings").select("*").eq("business_id", membership.business_id).maybeSingle(),
      supabase.from("business_branding").select("*").eq("business_id", membership.business_id).maybeSingle(),
    ]);
    setBusiness(bizRes.data ?? null);
    setSettings(setRes.data ?? null);
    setBranding(brandRes.data ?? null);
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
    loading: session === undefined || loading,
    reload,
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
