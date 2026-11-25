// ===========================================================================
// JOURNEYS — use the product like a real customer and detailer (plan §5, chunk 7).
// ===========================================================================
//
// The platform repo already holds proven end-to-end browser scripts that grade
// themselves (`N passed, M failed`, a receipt, a canary, sabotage switches). The
// audit runs those against the LAPTOP app on STAGING instead of writing new ones.
//
// Safety, enforced here rather than trusted:
//   - a script with the live project's ref in it, or one that sends real mail
//     without a free override, is refused (Resend's 100 a day is shared with
//     Andrew's real business — docs/shared-resources.md § 3);
//   - every Supabase setting is pointed at staging and the run refuses if any
//     environment value still names the live project;
//   - the repo is left exactly as found: files a script writes are moved into
//     the audit's evidence folder and tracked files it rewrote are restored.
//
// Scripts that hard-wire http://localhost:5173 cannot be pointed at staging
// (that copy of the app talks to live), so they are NOT in the library; the
// audit reports that as a gap instead (see SKIPPED).

import { REPO_ROOT } from "./paths.mjs";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, cpSync, rmSync, lstatSync, rmdirSync, unlinkSync, symlinkSync } from "node:fs";
import path from "node:path";
import { readEnv, LIVE_REF } from "./audit-staging.mjs";
import { AUDIT_APP_PORT } from "./audit-app.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

export const JOURNEYS = [
  { id: "book-full", area: "Booking", name: "A customer books; the detailer accepts; the customer moves it, then cancels",
    script: "e2e-booking.mjs", args: ["--to=e2e@fixture.test", "--slug=demo-detail"], base: "BASE" },
  { id: "ten-features", area: "Booking", name: "Ten everyday features, end to end", script: "e2e-ten-features.mjs", args: [] },
  { id: "travel-price", area: "Money", name: "Travel zones add the right fee", script: "travel-price-walk.mjs", args: [], base: "BASE" },
  { id: "tenant-matrix", area: "Customers", name: "One business tries to read and change another's data", script: "tenant-matrix.mjs", args: [] },
  { id: "tenant-edge", area: "Customers", name: "Server functions refuse requests for another business", script: "edge-tenant-replay.mjs", args: [] },
  { id: "tours-race", area: "Settings", name: "Two first visits at the same moment", script: "user-tours-race.mjs", args: [], base: "BASE_URL" },
  // trusted (ROADMAP 101.6, f19fdcbe): names the live ref only inside its allow-list guard
  // (platform dev + this audit's staging copy), and refuses every other project.
  { id: "browser-features", area: "Booking", name: "Push sign-up and card billing in a real browser",
    script: "e2e-browser-features.mjs", args: [], base: "BASE", trusted: true },
];
// Run once before a run's screenshots and journeys: puts the demo business back as seeded, so press-tests
// and journeys never wear the test data out (review 2026-10-20). Its write to app/public/map.html lands
// in the audit's own copy of the platform, which is thrown away.
export const RESEED = { id: "reseed", area: "Booking", name: "Reset the demo business on the test copy", script: "seed-demo.mjs", args: [], trusted: true };

// pattern = the line that makes it impossible, cited in the finding the engine writes
export const SKIPPED = [
  // BASE and --to= were fixed in 101.6, but it would fail on every staging run (a permanent false red)
  { script: "e2e-receipt-trail.mjs", area: "Booking", why: "its first step is e2e-payment.mjs, which only allows the platform's own project", pattern: '"scripts/e2e-payment.mjs"' },
  { script: "e2e-payment.mjs", area: "Money", why: "only allows the platform's own project (the deposit-payment test), so it refuses the test copy", pattern: "kguqylyzgyzfktkfnhjb" },
  { script: "billing-walk.mjs", area: "Money", why: "only allows the platform's own project and defaults to the LIVE booking site (the subscription test)", pattern: "kguqylyzgyzfktkfnhjb" },
];

// Pure: why a script may not run on staging, or null.
export function refuse(source, j) {
  // trusted: read and known to use the ref only as a guard (seed-demo grants admin only ON the platform project)
  if (source.includes(LIVE_REF) && !j.trusted) return "it would touch the live site";   // R2 N-P2-9: was "it names the live project"
  if (/realMail\(/.test(source) && !(j.args || []).some((a) => a.startsWith("--to="))) return "it sends real email with no free override";
  if (/["'`]http:\/\/localhost:5173/.test(source) && !j.base) return "it hard-wires the live-connected app on :5173";
  return null;
}

// Pure: "43 passed, 1 failed" and the FAIL lines.
export function readResult(out) {
  const all = [...String(out).matchAll(/(\d+) passed,\s*(\d+) failed/g)].map((m) => [m[1], m[2]]);
  // the repo's other house style: "PASS — 3/3 targets, 39 assertions, 0 failure(s)"
  for (const m of String(out).matchAll(/(\d+) assertions?, (\d+) failure/g)) all.push([String(Number(m[1]) - Number(m[2])), m[2]]);
  const last = all.at(-1);
  const fails = String(out).split(/\r?\n/).filter((l) => /^\s*(FAIL|✖|not ok)\b/.test(l)).map((l) => l.trim().replace(/^(FAIL|✖|not ok)\s*/, "")).slice(0, 30);
  return last ? { passed: Number(last[0]), failed: Number(last[1]), fails } : { passed: null, failed: null, fails };
}

export function stagingEnv(repo) {
  const base = readEnv(path.join(repo, ".env")), s = readEnv(path.join(repo, ".env.staging"));
  if (!s.STAGING_URL || !s.STAGING_SERVICE_ROLE_KEY) throw new Error("staging is not set up");
  const env = { ...process.env, ...base,
    SUPABASE_URL: s.STAGING_URL, SUPABASE_ANON_KEY: s.STAGING_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: s.STAGING_SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_REF: s.STAGING_PROJECT_REF, SUPABASE_PUBLISHABLE_KEY: s.STAGING_PUBLISHABLE_KEY || "", SUPABASE_SECRET_KEY: s.STAGING_SECRET_KEY || "",
    DATABASE_URL: "" };
  for (const [k, v] of Object.entries(env)) if (typeof v === "string" && v.includes(LIVE_REF)) throw new Error(`refusing: ${k} still points at live`);
  return env;
}

// "Something answers on the port" is not "it is OUR app on staging": on 2026-10-15 a belt job's own
// app sat on :5180 and an audit ran against it. So ask the app which database it talks to: Vite
// inlines import.meta.env into the module it serves, and that must name staging (and never live).
async function appUp(port) {
  try {
    const r = await fetch(`http://localhost:${port}/src/lib/supabase.js`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    const src = await r.text();
    return src.includes(STAGING_REF()) && !src.includes(LIVE_REF);
  } catch { return false; }
}
const STAGING_REF = () => readEnv(path.join(process.env.AUDIT_REPO || REPO_ROOT, ".env.staging")).STAGING_PROJECT_REF || "no-staging-ref";
async function portTaken(port) {
  try { await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(3000) }); return true; } catch { return false; }
}
// Starts the laptop app against staging if it is not already running. Returns a stop function.
// ── THE AUDIT'S OWN COPY OF THE PLATFORM (review 2026-10-20, must-fix 7) ──
// Journeys, the app under test and the auditors work in a throwaway git worktree of the platform
// at its committed HEAD: never in Andrew's checkout, where other sessions have unsaved files that
// a journey's clean-up could move or revert, and where half-finished edits would be tested under
// a commit number that does not contain them. The copy borrows the checkout's installed packages
// through a junction; clean-up removes the junction itself and never what it points to.
const LINKED = ["app/node_modules", "node_modules"];
function unlinkJunctions(dir) {
  for (const nm of LINKED) {
    const p = path.join(dir, nm);
    let st; try { st = lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) { try { rmdirSync(p); } catch { try { unlinkSync(p); } catch {} } }
  }
}
export function prepareCheckout(mainRepo, dir) {
  const g = (...a) => execFileSync("git", ["-C", mainRepo, ...a], { windowsHide: true, encoding: "utf8" }).trim();
  if (existsSync(dir)) {
    unlinkJunctions(dir);
    try { g("worktree", "remove", "--force", dir); } catch {}
    for (const nm of LINKED) if (existsSync(path.join(dir, nm)) && lstatSync(path.join(dir, nm)).isSymbolicLink()) throw new Error(`refusing: ${nm} link could not be removed safely`);
    rmSync(dir, { recursive: true, force: true });
  }
  try { g("worktree", "prune"); } catch {}
  g("worktree", "add", "--detach", "--force", dir, "HEAD");
  for (const nm of LINKED) { const src = path.join(mainRepo, nm); if (existsSync(src) && !existsSync(path.join(dir, nm))) symlinkSync(src, path.join(dir, nm), "junction"); }
  return { dir, sha: execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { windowsHide: true, encoding: "utf8" }).trim() };
}
export function removeCheckout(mainRepo, dir) {
  if (!existsSync(dir)) return;
  unlinkJunctions(dir);
  try { execFileSync("git", ["-C", mainRepo, "worktree", "remove", "--force", dir], { windowsHide: true }); } catch {}
}

// The app process the audit started, so an orphan from a crashed run can be ended by its own pid.
const APP_PID = path.join(HERE, "data", "audit", "app.pid");
function endOrphanApp() {
  let pid = 0; try { pid = Number(readFileSync(APP_PID, "utf8")); } catch {}
  if (pid) { try { execFileSync("taskkill", ["/T", "/F", "/PID", String(pid)], { windowsHide: true, stdio: "ignore" }); } catch {} try { rmSync(APP_PID); } catch {} }
}
export async function ensureApp(appRepo = null) {
  if (appRepo) endOrphanApp();   // a new run's copy: never reuse an app serving an older copy
  else if (await appUp(AUDIT_APP_PORT)) return () => {};
  for (let i = 0; i < 10 && await portTaken(AUDIT_APP_PORT); i++) await new Promise((r) => setTimeout(r, 1000));
  if (await portTaken(AUDIT_APP_PORT)) throw new Error(`port ${AUDIT_APP_PORT} is held by something that is not the audit's staging app; nothing was tested`);
  const child = spawn(process.execPath, [path.join(HERE, "audit-app.mjs")], { cwd: HERE, windowsHide: true, stdio: "ignore", detached: false,
    env: { ...process.env, ...(appRepo ? { AUDIT_APP_REPO: appRepo } : {}) } });
  try { mkdirSync(path.dirname(APP_PID), { recursive: true }); writeFileSync(APP_PID, String(child.pid)); } catch {}
  for (let i = 0; i < 90 && !(await appUp(AUDIT_APP_PORT)); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await appUp(AUDIT_APP_PORT))) throw new Error("the laptop app did not start on :" + AUDIT_APP_PORT);
  return () => { try { spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true }); } catch {} try { rmSync(APP_PID); } catch {} };
}

const porcelain = (repo) => execFileSync("git", ["-C", repo, "status", "--porcelain", "-uall"], { windowsHide: true, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);

// Runs one journey. Leaves the repo as it found it. Never throws for a failing journey.
export async function runJourney(j, { repo, envRepo = null, evidenceDir, secrets = [], timeoutMs = 15 * 60000, signal = null }) {
  if (signal?.aborted) return { ok: false, skipped: "the run was stopped" };
  mkdirSync(evidenceDir, { recursive: true });
  const scriptPath = path.join(repo, "scripts", j.script);
  let src = ""; try { src = readFileSync(scriptPath, "utf8"); } catch { return { ok: false, skipped: "the script is missing" }; }
  const no = refuse(src, j);
  if (no) return { ok: false, skipped: no };
  const missing = (j.needs || []).filter((k) => !secrets.includes(k));
  if (missing.length) return { ok: false, skipped: `staging is missing ${missing.join(", ")} (Andrew's key steps in STAGING.md)` };
  const env = stagingEnv(envRepo || repo);   // keys live in the real checkout; the code runs from the audit's copy
  if (j.base) env[j.base] = `http://localhost:${AUDIT_APP_PORT}`;
  const before = new Set(porcelain(repo));
  const log = path.join(evidenceDir, `${j.id}.log`);
  const started = Date.now();
  const out = await new Promise((resolve) => {
    let text = "";
    const child = spawn(process.execPath, [scriptPath, ...(j.args || [])], { cwd: repo, env, windowsHide: true });
    const t = setTimeout(() => { text += "\n[audit] stopped: took longer than the time allowed\n"; try { spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true }); } catch {} }, timeoutMs);
    child.stdout.on("data", (c) => (text += c));
    child.stderr.on("data", (c) => (text += c));
    const onAbort = () => { text += "\n[audit] stopped by Andrew\n"; try { spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true }); } catch {} };
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("close", (code) => { clearTimeout(t); signal?.removeEventListener("abort", onAbort); resolve({ text, code }); });
  });
  writeFileSync(log, out.text);
  // put the repo back: new files become evidence, rewritten tracked files are restored —
  // ONLY paths these scripts are known to write. The belt and other sessions edit this
  // repo too, and "restore whatever changed" would destroy their work.
  const OURS = /^(receipts\/|artifacts\/|app\/public\/map\.html$|\.tmp-)/;
  const moved = [], restored = [], leftAlone = [];
  for (const line of porcelain(repo)) {
    if (before.has(line)) continue;
    const p = line.slice(3).replace(/^"|"$/g, "");
    if (!OURS.test(p)) { leftAlone.push(p); continue; }
    if (line.startsWith("??")) {
      const dest = path.join(evidenceDir, "files", p);
      mkdirSync(path.dirname(dest), { recursive: true });
      try { renameSync(path.join(repo, p), dest); } catch { try { cpSync(path.join(repo, p), dest); rmSync(path.join(repo, p), { force: true }); } catch {} }
      moved.push(p);
    } else if (/^ M|^M /.test(line)) {
      try { execFileSync("git", ["-C", repo, "checkout", "HEAD", "--", p], { windowsHide: true }); restored.push(p); } catch {}
    }
  }
  const r = readResult(out.text);
  return { ok: true, ...r, code: out.code, seconds: Math.round((Date.now() - started) / 1000), log, moved, restored, leftAlone };
}

// The secret NAMES staging has (never values), so journeys that need a key wait for it.
export async function stagingSecretNames(repo) {
  const env = { ...readEnv(path.join(repo, ".env")), ...readEnv(path.join(repo, ".env.staging")) };
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.STAGING_PROJECT_REF}/secrets`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } });
  const j = await r.json();
  return Array.isArray(j) ? j.map((s) => s.name) : [];
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const repo = process.env.AUDIT_REPO || REPO_ROOT;
  const id = process.argv[2] || "book-full";
  const j = JOURNEYS.find((x) => x.id === id);
  const stop = await ensureApp();
  const res = await runJourney(j, { repo, evidenceDir: path.join(HERE, "data", "audit", "journeys", new Date().toISOString().slice(0, 19).replace(/:/g, "-")), secrets: await stagingSecretNames(repo) });
  console.log(JSON.stringify({ ...res, fails: res.fails?.slice(0, 5) }, null, 1));
  stop();
}
