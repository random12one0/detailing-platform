// RequireAdmin — auth guard for the new admin. Mirrors AdminProtectedRoute's
// Supabase session + active-admin_users check, but wraps arbitrary children so it
// can gate the /admin shell (the primary admin) with the same auth as the classic one.
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AdminLogin from "../components/AdminLogin";

export default function RequireAdmin({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from("admin_users")
          .select("*")
          .eq("id", session.user.id)
          .eq("is_active", true)
          .single();
        setAdminUser(!error && data ? data : null);
      } else {
        setAdminUser(null);
      }
    };
    if (session) checkAdmin();
  }, [session]);

  if (loading) return null;
  if (!session || !adminUser)
    return <AdminLogin onLogin={() => window.location.reload()} />;
  return children;
}
