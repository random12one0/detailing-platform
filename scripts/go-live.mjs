// THE SWITCH: test-mode Stripe -> live-mode Stripe (GitHub issue #6). Read docs/GO-LIVE.md first.
//
//   node scripts/go-live.mjs --dry-run                 # prints what it would do, changes nothing (safe any time)
//   node scripts/go-live.mjs --confirm-live            # does it
//
// Reads these from the local env file (never printed, never written back): STRIPE_LIVE_SECRET_KEY,
// STRIPE_LIVE_PUBLISHABLE_KEY, STRIPE_LIVE_WEBHOOK_SECRET, STRIPE_LIVE_CONNECT_WEBHOOK_SECRET, STRIPE_LIVE_CONNECT_CLIENT_ID.
// The test values (STRIPE_SECRET_KEY etc.) stay in the env file untouched, so going back is putting those on the server.
//
// REFUSES unless --confirm-live is passed AND every platform-health check passes (backup, deployed functions,
// database). It deliberately does NOT wait on the Stripe-mode items (that is what it fixes) nor on the demo-admin
// lock and Terms wording: those gate the first real customer, and the lock comes AFTER the $1 proof because ~60
// browser checks still sign in as the demo logins.

import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, SECRETS, liveName, loadEnv, runChecks, printChecks, deployedDigests, setSecrets, sha256, stripeCall, dpProducts, PRODUCT_TAG } from "./lib/goLive.mjs";

loadEnv();
const DRY = process.argv.includes("--dry-run");
const CONFIRM = process.argv.includes("--confirm-live");
const say = (s = "") => console.log(s);
const stop = (why) => { console.error(`\nREFUSED: ${why}`); process.exit(1); };
// In a dry run a refusal reason is printed and the plan continues; for real it ends the run.
const refuse = (why) => (DRY ? say(`\nWOULD REFUSE: ${why}`) : stop(why));

if (!DRY && !CONFIRM) stop("this switches real payments on. Pass --dry-run to see the plan, or --confirm-live to do it.");

// 1. The platform must be healthy. Stripe-mode and first-customer items are expected to be open.
say("Step 1: preflight (a minute or two)...");
const rows = await runChecks();
printChecks(rows.filter((r) => r.kind === "gate"));
if (rows.some((r) => r.kind === "gate" && r.status !== "PASS")) refuse("a platform-health check failed. Fix it, then run again.");

// 2. The live values, validated by prefix only.
const live = Object.fromEntries(SECRETS.map((s) => [s.name, (process.env[liveName(s.name)] || "").trim()]));
const bad = SECRETS.filter((s) => !s.prefixes.some((p) => !p.endsWith("_test_") && live[s.name].startsWith(p))).map((s) => liveName(s.name));
if (bad.length) refuse(`missing or wrong live values in the env file: ${bad.join(", ")}.`);
const haveLive = !bad.length;

// 3. The live account must really be able to take money.
if (haveLive) {
  const a = await stripeCall(live.STRIPE_SECRET_KEY, "GET", "/account");
  if (!a.charges_enabled || !a.payouts_enabled) refuse(`the live Stripe account is not fully activated (charges_enabled=${a.charges_enabled}, payouts_enabled=${a.payouts_enabled}).`);
}

// 4. Products to mirror: every test-mode product tagged dp-line, created in live if its name is missing.
const testKey = process.env.STRIPE_SECRET_KEY || "";
const testNames = testKey.startsWith("sk_test_") ? (await dpProducts(testKey)).map((p) => p.name) : [];
const liveNames = haveLive ? (await dpProducts(live.STRIPE_SECRET_KEY)).map((p) => p.name) : [];
// Names written with an em dash are from before the middle-dot wording; the code no longer asks for them.
const toCreate = testNames.filter((n) => !n.includes(" — ") && !liveNames.includes(n));

// 5. Functions that read a Stripe secret: whichever import _shared/stripe.ts or _shared/connect.ts.
const fnRoot = path.join(ROOT, "supabase", "functions");
const functions = readdirSync(fnRoot, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name).filter((n) => /_shared\/(stripe|connect)\.ts/.test(readFileSync(path.join(fnRoot, n, "index.ts"), "utf8")));

say("\nPLAN");
say(`  1. Create ${toCreate.length} missing live Stripe product(s) tagged ${PRODUCT_TAG}${toCreate.length ? `: ${toCreate.join("; ")}` : ""}. (There are no price ids: amounts are sent from code on every charge.)`);
say(`  2. Set ${SECRETS.length} server secrets to the live values: ${SECRETS.map((s) => s.name).join(", ")}.`);
say(`  3. Redeploy ${functions.length} function(s) that read them: ${functions.join(", ")}.`);
say("  4. Read the server's secret digests back and confirm every one equals the live value.");
if (DRY) { say("\nDRY RUN: nothing was changed."); process.exit(0); }

// ---- the real thing ----
for (const name of toCreate) {
  await stripeCall(live.STRIPE_SECRET_KEY, "POST", "/products", { name, metadata: { tag: PRODUCT_TAG } }, `golive:product:${sha256(name).slice(0, 24)}`);
  say(`created live product: ${name}`);
}
await setSecrets(live);
say(`set ${SECRETS.length} secrets`);
const dep = spawnSync(process.execPath, ["scripts/deploy-functions.mjs", ...functions], { cwd: ROOT, env: process.env, stdio: "inherit" });
if (dep.status !== 0) stop(`a deploy failed. The secrets are already live; re-run "node scripts/deploy-functions.mjs ${functions.join(" ")}" and then go-live-check.`);
const digests = await deployedDigests();
const wrong = SECRETS.filter((s) => digests[s.name] !== sha256(live[s.name]));
if (wrong.length) stop(`the server does not hold the live value for: ${wrong.map((s) => s.name).join(", ")}.`);

say(`
DONE. The server is now in LIVE mode. Nothing is charged yet. What is left, in order:
  1. Run: node scripts/go-live-check.mjs   (every Stripe item should now say PASS)
  2. The $1 proof: ask Claude for the one-use $1 promo code, buy the Booking plan on detailingplatform.com
     with your own real card, then in Stripe (live mode) > Payments refund it and cancel the subscription.
  3. After the refund shows: lock the demo admins and settle the Terms wording (docs/GO-LIVE.md steps 8 and 9).`);
