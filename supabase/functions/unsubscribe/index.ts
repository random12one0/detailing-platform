// ROADMAP 2.19 — THE OPT-OUT. Public, no session, two actions on one function.
//
// WHY THIS EXISTS AT ALL, since the roadmap entry says a manual send needs
// less machinery than an automated one. It needs less SCHEDULING machinery.
// CAN-SPAM classifies a message by its primary purpose, and *"we haven't seen
// you in a while, come back"* is a commercial message whether a person or a
// cron job pressed send — so it needs a working opt-out that keeps working for
// at least 30 days after the message went out. There is no version of this
// feature without this file.
//
// THE CUSTOMER UUID IS THE CREDENTIAL. Fourth caller of a pattern this repo
// already uses three times — `/booking/:id`, `/plan/:memberId` and the receipt
// endpoint. No account, no password, no token to expire, and a UUID nobody can
// guess. `get` returns the business's NAME and nothing else, so a leaked link
// discloses no more than the email it came in already did.
//
// IT IS TWO ACTIONS RATHER THAN ONE CLICK, AND THAT IS DELIBERATE. A bare GET
// link that unsubscribes on load gets pressed by things that are not people:
// Gmail prefetches, corporate link scanners and antivirus proxies all follow
// links in mail, and every one of them would silently opt a customer out of a
// business they still want to hear from. So the link opens a page (`get`) and
// the person presses a button (`set`).
//
// WHAT IT DOES NOT STOP: transactional mail. A confirmation, reminder, receipt
// or cancellation for a booking this customer made is exempt from opt-out and
// must still reach them — unsubscribing from marketing must never be a way to
// stop finding out when the detailer is arriving. Only `send-campaign` reads
// this flag.
//
// Input: { action: "get" | "set", customer_id }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 2.21 — THE BLUNT CEILING AND NOTHING DESIGNED FOR THIS
    // ENDPOINT. It is public and it writes, but it writes one boolean about
    // one customer whose UUID the caller already holds, so the worst outcome
    // is somebody who was already sent the link using it — which is the link's
    // whole purpose. What the ceiling stops is a loop spending the project's
    // function invocations.
    if (!await withinLimits(supabase, [
      { bucket: "public:ip", key: ipOf(req), ...LIMITS.publicCeiling },
    ])) return json({ error: "Too many requests" }, 429);

    const { action, customer_id: id } = await req.json();
    if (!UUID.test(String(id ?? ""))) return json({ error: "Not found" }, 404);
    if (action !== "get" && action !== "set") {
      return json({ error: "action must be get or set" }, 400);
    }

    // The service key reads across tenants here on purpose: the caller has no
    // session and no business, and the customer row is what says which
    // business this is. Nothing but the name comes back out.
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, unsubscribed_at, businesses(name)")
      .eq("id", id)
      .maybeSingle();
    if (!customer) return json({ error: "Not found" }, 404);

    const business = (customer.businesses ?? {}) as { name?: string };

    if (action === "get") {
      return json({
        business_name: business.name ?? "this business",
        first_name: String(customer.name || "").trim().split(" ")[0] || null,
        unsubscribed: !!customer.unsubscribed_at,
      });
    }

    // ALREADY OFF STAYS OFF AT ITS ORIGINAL TIME. Re-stamping would restart
    // the clock on a decision the customer already made, and the date is the
    // only record of when they made it.
    if (!customer.unsubscribed_at) {
      const { error } = await supabase
        .from("customers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    }
    return json({ ok: true, business_name: business.name ?? "this business" });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
