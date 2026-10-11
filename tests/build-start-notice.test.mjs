// ROADMAP 0.4 — THE BUILD-START NOTICE COUNTS AS SENT ONLY IF IT REACHED THE PROVIDER.
//
//   node --test tests/build-start-notice.test.mjs
//   BREAK=flag node --test tests/build-start-notice.test.mjs   # sabotage: build_start stops asking
//
// Credential-free: no .env, no network, two file reads and one pure import.
//
// THE DEFECT. `send-email` answers `200 { success: true, skipped }` for a send it
// never made (a reserved-domain address, or no provider key). `build_start`
// read that as "told them" and wrote the day their build fee stops being
// refundable. The fix is `reachedProvider` plus an opt-in flag on
// `sendTenantEmail` that only `build_start` sets — every other caller keeps
// the fixture-sink behaviour on purpose (`tests/_mail.mjs`).
//
// BREAK is an env var, not a flag: `node --test` swallows argv (docs/gotchas.md 104).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { reachedProvider } from "../supabase/functions/_shared/reachedProvider.ts";

const FN = "supabase/functions";
const BREAK = process.env.BREAK || "";
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

test("the relay's answers: only a real hand-off counts", () => {
  assert.equal(reachedProvider(true, { success: true, id: "re_123" }), true, "a provider id is a send");
  assert.equal(reachedProvider(true, { success: true, skipped: "undeliverable_domain" }), false, "a reserved domain is not a send");
  assert.equal(reachedProvider(true, { success: true, skipped: "no_provider_key" }), false, "no provider key is not a send");
  assert.equal(reachedProvider(false, { error: "Failed to send email", reason: "daily_cap" }), false, "a refusal is not a send");
  assert.equal(reachedProvider(true, null), false, "an unreadable answer is not a send");
});

test("sendTenantEmail consults it under mustReachProvider, and nowhere else changes", () => {
  const src = read(join(FN, "_shared/email.ts"));
  assert.match(src, /import \{ reachedProvider \} from "\.\/reachedProvider\.ts";/);
  assert.match(src, /mustReachProvider\?: boolean;/);
  assert.match(src, /if \(!opts\.mustReachProvider \|\| !res\.ok\) return res\.ok;/,
    "without the flag the old answer (res.ok) must stand, or every fixture-sink flow breaks");
  assert.match(src, /return reachedProvider\(res\.ok, answer\);/);
});

test("build_start, and ONLY build_start, asks for a real send", () => {
  let admin = read(join(FN, "platform-admin/index.ts"));
  if (BREAK === "flag") {
    const before = admin;
    admin = admin.replace("mustReachProvider: true,", "");
    console.log(`BREAK=flag: removed the flag from build_start in memory (changed: ${before !== admin})`);
  }
  const start = admin.indexOf('if (action === "build_start")');
  const end = admin.indexOf("logIt(admin, \"build_start\"", start);
  assert.ok(start > 0 && end > start, "found the build_start handler");
  const handler = admin.slice(start, end);
  assert.match(handler, /mustReachProvider: true,/, "build_start must refuse to stamp on a skipped send");
  assert.ok(handler.indexOf("mustReachProvider: true") < handler.indexOf("stampBuildStart(supabase, id, startedAt)"),
    "the check happens before the date is written");

  // EQUALITY, not a ceiling (docs/gotchas.md 98): a second caller opting in is
  // a decision somebody should see, not one that slips under a limit.
  const callers = [];
  for (const dir of readdirSync(FN, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(FN, dir.name)).filter((n) => n.endsWith(".ts"))) {
      const text = dir.name === "platform-admin" && f === "index.ts" ? admin : read(join(FN, dir.name, f));
      if (/mustReachProvider: true/.test(text)) callers.push(`${dir.name}/${f}`);
    }
  }
  console.log(`callers that require a real send: ${callers.length} — ${callers.join(", ") || "none"}`);
  assert.deepEqual(callers, ["platform-admin/index.ts"]);
});
