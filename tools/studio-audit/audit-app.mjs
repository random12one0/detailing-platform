// ===========================================================================
// THE LAPTOP APP, POINTED AT STAGING — what every audit run tests (plan §6).
// ===========================================================================
//
//   node audit-app.mjs            dev server on :5291 against detailing-staging
//
// The laptop's own screens (the platform repo's app/ folder, as it is right
// now) with the server half on staging instead of live. Its own port, so it
// never collides with the belt's copies on :5173 and :5180. Process environment beats the
// app's .env.local in Vite, so nothing in the repo is edited.

import { REPO_ROOT } from "./paths.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { readEnv, LIVE_REF } from "./audit-staging.mjs";

const REPO = process.env.AUDIT_REPO || REPO_ROOT;
export const AUDIT_APP_PORT = Number(process.env.AUDIT_APP_PORT || 5291);

export function stagingAppEnv(repo = REPO) {
  const s = readEnv(path.join(repo, ".env.staging"));
  if (!s.STAGING_URL || !s.STAGING_ANON_KEY) throw new Error("staging keys missing from .env.staging");
  if (s.STAGING_URL.includes(LIVE_REF)) throw new Error("refusing: STAGING_URL points at live");
  return { VITE_SUPABASE_URL: s.STAGING_URL, VITE_SUPABASE_ANON_KEY: s.STAGING_ANON_KEY };
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const child = spawn("npm", ["run", "dev", "--prefix", "app", "--", "--port", String(AUDIT_APP_PORT), "--strictPort"],
    // the code from the audit's own copy when one is given (AUDIT_APP_REPO); the staging keys from the real checkout
    { windowsHide: true, cwd: process.env.AUDIT_APP_REPO || REPO, stdio: "inherit", shell: true, env: { ...process.env, ...stagingAppEnv() } });
  child.on("exit", (code) => process.exit(code ?? 0));
}
