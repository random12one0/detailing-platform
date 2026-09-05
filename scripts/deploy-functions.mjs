// Deploys every edge function in supabase/functions/ to the platform's
// Supabase project via the Management API (multipart deploy — no CLI or
// direct DB connection needed).
//
// Each function is uploaded together with the _shared modules it imports;
// `../_shared/...` imports are rewritten to `./_shared/...` so the bundle is
// self-contained under the function's own root.
//
// Requires env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
// Usage: node scripts/deploy-functions.mjs [fn ...]   (default: all)

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}

// Functions the public site calls without a user session. Everything else
// requires a valid JWT at the gateway (and checks membership internally).
const PUBLIC_FUNCTIONS = new Set([
  "available-slots",
  "calculate-booking",
  "create-booking",
  "validate-promo-code",
  "get-booking-receipt",
  "track-visit",
  "cancel-booking",
  "reschedule-booking",
  // Roadmap 2.12 — the customer accepting a quote from the link in their
  // email. Same access model as the two above: the booking UUID is the
  // credential, and there is no session on that page.
  "accept-quote",
  "send-owner-reminders", // scheduled sweep; manual mode still checks membership itself
  "send-email",           // internal relay; gates itself on the service-role key
  "accept-invite",        // invite landing page — the invitee has no session yet
  "booking-ics",          // customers add their own booking to a calendar from email
  // Roadmap 2.14 step 3 — the customer's own plan page and the email-in /
  // link-out lookup behind it. Same access model again: the membership UUID
  // is the credential, and a plan member has no session and never will.
  "plan-link",
  // Roadmap 2.19 — the opt-out at the bottom of the one commercial email this
  // product sends. It MUST be public: the person pressing it is a customer
  // who never had a session and, if the law is to mean anything, must not be
  // asked to acquire one in order to leave. Same credential as the three
  // above — the row's own UUID.
  "unsubscribe",
  // ROADMAP 2.20 STAGE 2 — Stripe's webhook. It MUST be public and this is the
  // one entry in this list where that is load-bearing rather than convenient:
  // Stripe has no Supabase JWT to present, so with `verify_jwt` on, the
  // gateway rejects every event before the function runs and the whole dunning
  // mechanism silently does nothing — a subscription that goes unpaid for two
  // weeks and a booking page that never goes offline, with no error anywhere.
  // It is SAFE because the signature is the authentication: `verifyWebhook`
  // runs before anything else in that file, over the RAW body, with a
  // timestamp tolerance, and `tests/platform-billing.test.mjs` § 8 pins all
  // three. `platform-billing` is NOT here — it is the detailer's own session.
  "stripe-webhook",
]);

// fileURLToPath, not .pathname: on Windows .pathname yields "/D:/..." which
// readdir then resolves against the drive as "D:\D:\...".
const fnRoot = fileURLToPath(new URL("../supabase/functions/", import.meta.url));
const all = (await readdir(fnRoot, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .sort();
const targets = process.argv.length > 2 ? process.argv.slice(2) : all;

// `.js` AS WELL AS `.ts`, since roadmap 2.11 step 6 stage 6 put
// `_shared/brandColor.js` here — a plain ESM module with no Deno API in it,
// so the Node test can import the same file Deno runs and pin the two colour
// implementations against each other. Filtering to .ts would have left
// `email.ts` importing a file that was never uploaded, which breaks every
// function that sends mail at RUNTIME rather than at deploy time.
const sharedFiles = (await readdir(path.join(fnRoot, "_shared")))
  .filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

for (const fn of targets) {
  const indexSrc = await readFile(path.join(fnRoot, fn, "index.ts"), "utf8");
  const rewritten = indexSrc.replaceAll("../_shared/", "./_shared/");

  const form = new FormData();
  form.append(
    "metadata",
    JSON.stringify({
      name: fn,
      entrypoint_path: "index.ts",
      verify_jwt: !PUBLIC_FUNCTIONS.has(fn),
    }),
  );
  form.append("file", new Blob([rewritten], { type: "application/typescript" }), "index.ts");
  for (const sf of sharedFiles) {
    const content = await readFile(path.join(fnRoot, "_shared", sf), "utf8");
    form.append("file", new Blob([content], {
      type: sf.endsWith(".js") ? "application/javascript" : "application/typescript",
    }), `_shared/${sf}`);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions/deploy?slug=${fn}`,
    { method: "POST", headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }, body: form },
  );
  if (!res.ok) {
    console.error(`FAILED ${fn} [${res.status}]`);
    console.error((await res.text()).slice(0, 2000));
    process.exit(1);
  }
  const info = await res.json();
  console.log(`deployed ${fn} (version ${info.version ?? "?"}, verify_jwt=${!PUBLIC_FUNCTIONS.has(fn)})`);
}
console.log("all functions deployed");
