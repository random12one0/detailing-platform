// ROADMAP 97.19 — THE EDGE AND BROWSER HALVES OF "A DOUBLE PRESS SENDS ONCE" AND "CAMPAIGNS ARE
// CHARGED AS CAMPAIGNS". Credential-free, five filesystem reads.
//
//   node --test tests/campaign-press-once.test.mjs
//   BREAK=no-press       node tests/campaign-press-once.test.mjs   # sabotage: send-campaign never records the press
//   BREAK=press-late     node tests/campaign-press-once.test.mjs   # sabotage: the press is recorded AFTER the loop
//   BREAK=no-flag        node tests/campaign-press-once.test.mjs   # sabotage: campaigns are claimed as booking mail
//   BREAK=no-guard       node tests/campaign-press-once.test.mjs   # sabotage: the modal's second click is not stopped
//
// There is no Deno here, so `send-campaign` cannot be run; this reads the REAL source files and
// asserts ORDER and WIRING, which is what a value cannot show. Every BREAK edits the production
// text in memory and is proved to have landed before anything is judged (docs/gotchas.md 102).
// tests/campaign-share-sql.test.mjs holds the database half; scripts/campaign-double-press.mjs the
// browser half.

import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const BREAK = process.env.BREAK || "";
const src = (f) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const files = {
  campaign: src("supabase/functions/send-campaign/index.ts"),
  shared: src("supabase/functions/_shared/email.ts"),
  relay: src("supabase/functions/send-email/index.ts"),
  modal: src("app/src/components/CampaignModal.jsx"),
  api: src("app/src/lib/api.js"),
};
const SABOTAGE = {
  "no-press": ["campaign", '.from("campaign_presses")', '.from("nothing")'],
  "press-late": ["campaign", null, null],
  "no-flag": ["campaign", "        campaign: true,\n", ""],
  "no-guard": ["modal", "if (sending.current) return;", ""],
};
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
  const before = files[s[0]];
  if (BREAK === "press-late") {
    // Move the whole press block below the loop's closing line.
    const start = before.indexOf("    const { error: pressErr }");
    const end = before.indexOf("    if (pressErr) throw pressErr;\n") + "    if (pressErr) throw pressErr;\n".length;
    const block = before.slice(start, end);
    const without = before.slice(0, start) + before.slice(end);
    const after = without.indexOf("    // WHEN THIS BUSINESS LAST REACHED OUT");
    files[s[0]] = without.slice(0, after) + block + without.slice(after);
  } else {
    files[s[0]] = before.replace(s[1], s[2]);
  }
  if (files[s[0]] === before) throw new Error(`BREAK=${BREAK} did not change the source — the sabotage did not land`);
}

const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("97.19 · send-campaign records the press before it sends, and claims as a campaign", () => {
  const c = code(files.campaign);
  assert.ok(c.length > 3000, `send-campaign source read: ${c.length} bytes`);
  const pressAt = c.indexOf('.from("campaign_presses")');
  const firstSend = c.indexOf("await sendTenantEmail(");
  const lastRefusal = c.lastIndexOf("}, 400);", firstSend);
  assert.ok(pressAt > 0, "the press is recorded in campaign_presses");
  assert.ok(firstSend > 0 && lastRefusal > 0, "landmarks found");
  assert.ok(pressAt < firstSend, "the press is recorded BEFORE the first email");
  assert.ok(pressAt > lastRefusal, "the press is recorded AFTER every 400 refusal, so a refused press can be pressed again");
  assert.match(c, /pressErr\?\.code === "23505"[\s\S]{0,40}\{[\s\S]{0,120}\}, 409\)/, "a repeated press answers 409 and returns before sending");
  assert.match(c, /press_id[\s\S]{0,200}\[0-9a-f\]\{8\}-/, "a press without a well-formed id is refused");
  assert.match(c.slice(firstSend, firstSend + 400), /campaign: true,/, "every campaign email is claimed AS a campaign");
  assert.match(c, /if \(dailyCap\) \{\s*held = recipients\.length - i;\s*break;/, "the loop stops at the day's limit and counts the rest as held");
  assert.match(c, /\bheld,\n/, "held is returned to the screen");
});

test("97.19 · the relay passes business and kind through to the claim", () => {
  const sh = code(files.shared);
  assert.match(sh, /campaign: opts\.campaign === true,/, "sendTenantEmail forwards the campaign flag");
  assert.match(sh, /res\.status === 429 && failure\.includes\('"daily_cap"'\)\) opts\.onDailyCap\?\.\(\)/, "a daily-cap refusal is reported back");
  const r = code(files.relay);
  assert.match(r, /p_business_id: business_id \?\? null,\s*p_campaign: campaign === true,/, "send-email tells the claim whose and what kind");
});

test("97.19 · the modal sends one press id and stops a second click", () => {
  const m = code(files.modal);
  assert.match(m, /const \[pressId\] = useState\(\(\) => crypto\.randomUUID\(\)\);/, "one press id per compose");
  const sendAt = m.indexOf("const send = async () => {");
  assert.ok(sendAt > 0, "send() found");
  assert.match(m.slice(sendAt, sendAt + 120), /if \(sending\.current\) return;\s*sending\.current = true;/, "the second click returns before calling the server");
  assert.match(m, /api\.sendCampaign\(.*, pressId\);/, "the press id is sent");
  assert.match(code(files.api), /press_id: pressId/, "api.js carries it to the server");
  assert.match(m, /result\.held > 0/, "held addresses are told to the detailer");
});
