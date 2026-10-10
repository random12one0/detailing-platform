// ROADMAP 3.4f S3 — which of the business's own alert addresses are not
// receiving. One query per address, newest row only: a single query over all
// of them would let one busy address push another's newest row out of a limit.
// The list is one to a handful of addresses, so this is a handful of reads.
//
// Returns the broken addresses (empty while loading, on a failed read, and
// when everything is arriving — a warning is only ever drawn on evidence).
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { alertAddresses, ownAlertBroken } from "../lib/mailWarning.js";

export function useOwnAlertBounces() {
  const { business, settings } = useBusiness();
  const [broken, setBroken] = useState([]);
  const addrs = alertAddresses(business?.contact_email, settings?.notification_emails);
  const key = addrs.join("\n");
  useEffect(() => {
    let dead = false;
    if (!business?.id || !settings) { setBroken([]); return undefined; }
    (async () => {
      const rows = await Promise.all(key.split("\n").filter(Boolean).map(async (to) => {
        const { data } = await supabase.from("email_sends")
          .select("to_email, status, detail")
          .eq("business_id", business.id)
          .eq("to_email", to)
          .order("sent_at", { ascending: false })
          .limit(1);
        return ownAlertBroken(data?.[0]) ? to : null;
      }));
      if (!dead) setBroken(rows.filter(Boolean));
    })();
    return () => { dead = true; };
  }, [business?.id, !!settings, key]);
  return broken;
}
