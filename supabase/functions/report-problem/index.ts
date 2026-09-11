// A DETAILER TELLS US SOMETHING IS WRONG — his note, 2026-09-10.
//
// *"Report a problem — a way for a detailer to say 'there is nowhere to put
// this', sent to me. No code anywhere."*
//
// Input:  { business_id, message, screen? }
// Output: { ok: true }
//
// ---------------------------------------------------------------------------
// WHY THIS IS A FUNCTION AND NOT A `mailto:` LINK.
// ---------------------------------------------------------------------------
// A `mailto:` is one line and no deploy, and on a shop PC with no mail client
// configured it does NOTHING AT ALL — the exact dead-button failure this repo
// keeps recording. The one person who most needs to report a problem is the
// one whose setup is unusual, so the path that only works on a well-configured
// machine is the wrong path.
//
// **NOTHING HERE IS TYPED BY THE SENDER EXCEPT THE MESSAGE.** Who they are,
// which business, which plan, which screen and which version are all read on
// this side. That is the difference between a report that can be acted on and
// "it's broken" from an address nobody recognises — and it is also the part a
// detailer would never think to include.
//
// **THE CALLER IS AUTHENTICATED AND A MEMBER, which is what stops this being
// an open mail relay pointed at our own inbox.** `requireMember` reads the
// caller's own token; an anonymous POST gets 404, the same shape every other
// tenant endpoint uses, because a 403 tells a prober the endpoint is real.
//
// **AND THE MESSAGE IS ESCAPED BEFORE IT GOES IN THE HTML.** It is somebody
// else's text landing in our inbox: unescaped, a detailer who pastes an error
// containing `<script>` sends us a mail body we then read. Not a security
// boundary so much as basic hygiene, and the reason it is done HERE is that
// this is the only place the text and the markup meet.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { sendTenantEmail } from "../_shared/email.ts";

const SUPPORT_TO = Deno.env.get("SUPPORT_EMAIL") || "support@detailingplatform.com";
const MAX = 4000;

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const businessId = String(body.business_id ?? "").trim();
    // TRIMMED AND CAPPED BEFORE ANYTHING ELSE. A pasted stack trace is the
    // most useful report there is and also the longest; 4,000 characters is
    // several screens of one and still a bounded email.
    const message = String(body.message ?? "").trim().slice(0, MAX);
    const screen = String(body.screen ?? "").trim().slice(0, 120);
    if (!businessId || !message) {
      return json({ error: "business_id and message are required" }, 400);
    }

    const member = await requireMember(req, businessId);
    if (!member) return json({ error: "not_found" }, 404);

    // WHO AND WHAT, read here rather than trusted from the browser.
    const [{ data: business }, { data: user }] = await Promise.all([
      supabase.from("businesses").select("name, slug, timezone").eq("id", businessId).maybeSingle(),
      supabase.auth.admin.getUserById(member.userId),
    ]);
    const from = user?.user?.email ?? "(no address on the account)";

    const rows: [string, string][] = [
      ["Business", `${business?.name ?? "(unknown)"} · ${business?.slug ?? businessId}`],
      ["Who", `${from} · ${member.role}`],
      ["Screen", screen || "(not said)"],
      ["Sent", new Date().toISOString()],
    ];

    const ok = await sendTenantEmail({
      // NO `businessId`: this is the PLATFORM's own mail, to the platform's own
      // inbox, and passing a tenant here would put a detailer's brand name in
      // the From line of a message to ourselves — and, worse, mark a bounce
      // against a customer row that merely shares an address. The same
      // exception roadmap 2.20 stage 2 defined for billing mail.
      to: SUPPORT_TO,
      senderName: "Detailing Platform",
      subject: `Problem report — ${business?.name ?? businessId}`,
      html: `<h2 style="margin:0 0 12px">Problem report</h2>
<table cellpadding="4" style="border-collapse:collapse;font:14px system-ui">
${rows.map(([k, v]) => `<tr><td style="opacity:.6">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("\n")}
</table>
<hr style="margin:16px 0;border:none;border-top:1px solid #ddd">
<pre style="white-space:pre-wrap;font:14px system-ui;margin:0">${esc(message)}</pre>`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`,
    });

    // **A FAILED SEND IS REPORTED AS A FAILURE.** Everywhere else in this
    // product an email failure is swallowed, because a booking must not fail
    // over a receipt. Here the email IS the feature: telling a detailer their
    // report went when it did not is the one outcome that guarantees they
    // never report anything again.
    if (!ok) return json({ error: "send_failed" }, 502);
    return json({ ok: true });
  } catch (err) {
    console.error("report-problem:", err);
    return json({ error: "unexpected" }, 500);
  }
});
