// The Studio refuses to work on the real repo, so its tests need "a copy of the platform". The retired belt
// kept one at C:/studio-work/s1; this makes a fresh one from the checked-out repo instead (app source, scripts,
// the edge functions' shared rules and the example fixtures). One copy per test process, removed on exit.
// node_modules is linked package by package, not copied, and NOT its .vite folder: each copy's Vite keeps its own
// dependency cache, so two test files running together (or the real `npm run dev`) cannot rebuild each other's
// cache under a loading page, which made page loads time out.
// SITE_ACCEPTANCE_PLATFORM still wins, for anyone who wants to point the tests at a copy of their own.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO_ROOT } from "../paths.mjs";

let made;
export function platformCopy() {
  if (process.env.SITE_ACCEPTANCE_PLATFORM) return process.env.SITE_ACCEPTANCE_PLATFORM.replace(/\\/g, "/");
  if (made) return made;
  const realModules = path.join(REPO_ROOT, "app/node_modules");
  if (!existsSync(realModules)) throw new Error("run `npm ci --prefix app` first: the platform copy links app/node_modules");
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-platform-"));
  const keep = (src) => !/[\\/](node_modules|dist|\.git)$/.test(src);
  for (const d of ["app", "scripts", "supabase/functions"]) cpSync(path.join(REPO_ROOT, d), path.join(dir, d), { recursive: true, filter: keep });
  cpSync(path.join(REPO_ROOT, "tools/studio-audit/fixtures"), path.join(dir, "tools/studio-audit/fixtures"), { recursive: true });  // the example seed the engine reads
  const mine = path.join(dir, "app/node_modules");
  mkdirSync(mine);
  for (const e of readdirSync(realModules, { withFileTypes: true })) {
    if (e.name === ".vite" || e.name === ".cache" || !e.isDirectory()) continue;   // .bin is not needed: the Studio runs vite.js directly
    symlinkSync(path.join(realModules, e.name), path.join(mine, e.name), "junction");
  }
  process.on("exit", () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });   // rm does not follow the links
  return (made = dir.replace(/\\/g, "/"));
}
