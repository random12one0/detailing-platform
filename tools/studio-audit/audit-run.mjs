// Runs an audit from the command line, without the Control Room — for testing the
// engine with real AI before the tab is installed, and for the nightly run.
//
//   node audit-run.mjs --areas=Booking --kinds=code [--db=data/audit/audit.db] [--depth=quick|medium|deep]
//                      [--journeys=no] [--ai='{"kind":{"code":"codex:gpt-6.1-sol"}}']   (--ai: chooser settings for this run only)
//
// Uses the Claude Code command line on whatever plan it is signed into.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "./audit-store.mjs";
import { createEngine } from "./audit-engine.mjs";
import { removeCheckout } from "./audit-journeys.mjs";
import * as L from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=").slice(1).join("=") || d;
const C = JSON.parse(readFileSync(path.join(HERE, "belt.config.json"), "utf8"));
if (arg("cap", "")) C.audit = { ...(C.audit || {}), capUsd: Number(arg("cap", "25")) };   // --cap=60: this run's spending limit
if (arg("ai", "")) C.audit = { ...(C.audit || {}), ai: { ...((C.audit || {}).ai || {}), ...JSON.parse(arg("ai", "{}")) } };
const store = openStore(arg("db", path.join(HERE, "data", "audit", "audit.db")));
const engine = createEngine({ store, HERE, REPO: C.repo, C, readStream: L.readAnyStream, plainStep: L.plainStep, log: console.log });

// --resume: carry on the store's latest run (the engine put interrupted work back in the queue when it opened)
const r = arg("resume", "") ? { ok: true, said: "Carrying on run " + store.latestRun().n, run: store.latestRun().id } : await engine.start({ areas: arg("areas", "").split(",").filter(Boolean), kinds: arg("kinds", "") === "none" ? [] : arg("kinds", "") ? arg("kinds", "").split(",").filter(Boolean) : undefined,
  depth: arg("depth", "") || null, journeys: arg("journeys", "yes") !== "no" });   // --kinds=none = the free pass
console.log(r.said);
if (!r.ok) process.exit(1);
let seen = 0;
while (["running", "paused", "waiting", "planned"].includes(store.latestRun().status)) {
  await new Promise((x) => setTimeout(x, 5000));
  engine.pump();
  for (const e of store.events(r.run, seen)) { console.log(`${e.at.slice(11, 19)}  ${e.text}`); seen = e.id; }
}
const run = store.latestRun();
console.log(`\n${run.status} · $${run.cost_usd.toFixed(2)}`);
for (const f of store.findings(run.id)) console.log(`${f.id} [${f.status}] ${f.severity} · ${f.title}`);
// the run's own copy of the platform: removed here, because this program exits before the engine's delayed clean-up
await new Promise((x) => setTimeout(x, 4000));
if (run.scope?.checkout) removeCheckout(C.repo, run.scope.checkout);
engine.close(); store.close();
