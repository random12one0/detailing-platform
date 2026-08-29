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
  "send-owner-reminders", // scheduled sweep; manual mode still checks membership itself
  "send-email",           // internal relay; gates itself on the service-role key
  "accept-invite",        // invite landing page — the invitee has no session yet
  "booking-ics",          // customers add their own booking to a calendar from email
]);

// fileURLToPath, not .pathname: on Windows .pathname yields "/D:/..." which
// readdir then resolves against the drive as "D:\D:\...".
const fnRoot = fileURLToPath(new URL("../supabase/functions/", import.meta.url));
const all = (await readdir(fnRoot, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .sort();
const targets = process.argv.length > 2 ? process.argv.slice(2) : all;

const sharedFiles = (await readdir(path.join(fnRoot, "_shared"))).filter((f) => f.endsWith(".ts"));

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
    form.append("file", new Blob([content], { type: "application/typescript" }), `_shared/${sf}`);
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
