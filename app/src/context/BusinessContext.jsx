// Session + tenant context for the whole dashboard. After sign-in, the
// user's business comes from their business_users membership — everything on
// screen (brand name included) is that business's own data, never hardcoded.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { applyTheme, loadThemeMode, saveThemeMode } from "../lib/theme.js";

const Ctx = createContext(null);
export const useBusiness = () => useContext(Ctx);

export function BusinessProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [branding, setBranding] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeModeState] = useState("dark");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!session?.user) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: memberships } = await supabase
      .from("business_users")
      .select("business_id, role")
      .eq("user_id", session.user.id);
    const membership = memberships?.[0] ?? null; // multi-business switching comes later
    if (!membership) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setRole(membership.role);
    const [bizRes, setRes, brandRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", membership.business_id).single(),
      supabase.from("business_settings").select("*").eq("business_id", membership.business_id).maybeSingle(),
      supabase.from("business_branding").select("*").eq("business_id", membership.business_id).maybeSingle(),
    ]);
    setBusiness(bizRes.data ?? null);
    setSettings(setRes.data ?? null);
    setBranding(brandRes.data ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (session !== undefined) reload();
  }, [session, reload]);

  // Theme: saved per user, defaults to dark; the brand accent comes from
  // business_branding.primary_color and is contrast-corrected per theme.
  useEffect(() => {
    const mode = loadThemeMode(session?.user?.id);
    setThemeModeState(mode);
    applyTheme(mode, branding?.primary_color);
  }, [session, branding]);

  const setThemeMode = useCallback(
    (mode) => {
      setThemeModeState(mode);
      saveThemeMode(session?.user?.id, mode);
      applyTheme(mode, branding?.primary_color);
    },
    [session, branding],
  );

  const value = {
    session,
    business,
    settings,
    branding,
    role,
    loading: session === undefined || loading,
    reload,
    themeMode,
    setThemeMode,
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
