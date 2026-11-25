// STUDIO S6 — the referee's gates on one Studio spec (STUDIO-SPEC.md §4e), in a child process.
//
//   node studio-grade.mjs --platform <platform copy> --spec <spec.json> --out <folder>
//
// Draws the spec through the platform copy's renderer (/site/preview on a Vite dev server) against the offline
// example engine, and runs site-browser.mjs's gates on it: G0 (every stamp matches the dashboard, no digit outside a
// binding), G1 (layout, 44 px targets, console) G2 (accessibility, keyboard), G3 (booking path, contact, search
// basics) and G5 (motion), at 1440, 768 and 390 with a screenshot each. G4 (speed) is not run here: a dev server is
// not the built site, so its numbers would mean nothing (it belongs to Send for review).
// The Studio runs this as a hidden child, never inside the Control Room (the platform's code runs only in children).
// Writes <out>/gates.json: { ok, ms, gates: {G0,G1,G2,G3,G5}, shots: [...] } or { ok:false, error }.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const PLATFORM = path.resolve(arg("platform") || process.cwd());
const OUT = path.resolve(arg("out") || "studio-grade-out");
const t0 = Date.now();
mkdirSync(OUT, { recursive: true });
const write = (v) => writeFileSync(path.join(OUT, "gates.json"), JSON.stringify({ ...v, ms: Date.now() - t0 }, null, 2) + "\n");
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

let engine = null, vite = null;
try {
  const spec = JSON.parse(readFileSync(path.resolve(arg("spec")), "utf8"));
  process.env.SITE_ACCEPTANCE_PLATFORM = PLATFORM;
  const imp = (f) => import(pathToFileURL(path.join(PLATFORM, f)).href);
  const [{ startExampleEngine }, core, { browserGates }] = await Promise.all([imp("scripts/studio/example-engine.mjs"), imp("app/src/book/core.js"), import(pathToFileURL(path.join(HERE, "site-browser.mjs")).href)]);
  engine = await startExampleEngine({ port: 0 });
  const profile = core.normalizeProfile(await core.createBookingTransport({ supabaseUrl: engine.url, anonKey: "demo-anon" }).profile(spec.slug));
  const port = await freePort();
  vite = spawn(process.execPath, [path.join(PLATFORM, "app/node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: path.join(PLATFORM, "app"), env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon" }, windowsHide: true, stdio: "ignore" });
  const url = `http://127.0.0.1:${port}/site/preview`;
  if (!(await until(() => fetch(url).then((r) => r.ok)))) throw new Error("the site renderer (Vite) did not start");
  const gates = await browserGates(url, { out: OUT, profile, spec });
  write({ ok: true, gates, shots: gates.G1?.measures?.screenshots || [] });
} catch (e) {
  write({ ok: false, error: String(e?.message || e).split("\n")[0] });
} finally {
  if (vite) { try { spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" }); } catch {} }
  await engine?.close().catch(() => {});
  process.exit(0);
}
