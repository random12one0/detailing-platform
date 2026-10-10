// The one way the new back office talks to the server: the `platform-admin` edge
// function, behind the `platform_admins` gate. There is no `supabase.from()` in
// this folder, for the reason AdminPage.jsx's header gives. (AdminPage.jsx keeps
// its own copy of this until the old five tabs are retired, slice 5.)
import { supabase } from "../../lib/supabase.js";

export const call = async (body) => {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.error || `Request failed (${res.status})`);
  return out;
};
