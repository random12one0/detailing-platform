// PUT THE ROOT `.env` INTO `process.env` — import this FIRST in any suite that
// needs credentials.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// Measured 2026-09-08, running the whole battery: **eleven suites read
// EXPORTED variables and nothing in this repo exports them.** Run the obvious
// way — `node tests/owner-writes.test.mjs` — nine of them print *"Missing
// SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"* and five more run a fraction of
// themselves (`closed-until` 15 of 26, `dead-mans-switch` 26 of 44,
// `promo-checkout` 41 of 102). Only `multi-vehicle` loaded `.env` itself, and
// that is why its § 6 was the one credentialed section that ever ran by
// accident.
//
// **"Missing SUPABASE_URL" reads as a broken environment, not as a suite that
// did not run**, and a partial suite reads as a passing one — this repo's most
// repeated finding, arriving at the scale of the whole battery. The fix is not
// a line in a document telling the next session to `set -a; . ./.env`; it is
// the suites reading the file that is already sitting there.
//
// ---------------------------------------------------------------------------
// TWO PROPERTIES, BOTH LOAD-BEARING
// ---------------------------------------------------------------------------
// **A REAL EXPORTED VALUE ALWAYS WINS.** This only fills in what is absent, so
// pointing a run at another project (`SUPABASE_URL=… node tests/…`) still
// works, and no `.env` can quietly redirect a deliberate override.
//
// **A MISSING `.env` IS SILENT AND NOT AN ERROR.** A cloud session has no
// credentials at all (`docs/cloud/README.md`) and the credential-free suites
// must still run on a bare clone. Every caller already prints its own SKIPPED
// line naming what it could not do, which is the part that must stay loud.
//
// Import it for the side effect, before anything else:  import "./_env.mjs";
// It must be the FIRST import in the file, or a module that reads `Deno.env`
// or `process.env` at its own top level is evaluated before this one runs.

import { existsSync, readFileSync } from "node:fs";

const envPath = new URL("../.env", import.meta.url);

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const at = line.indexOf("=");
    if (at < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, at).trim();
    // Already set wins — see above. `in` rather than a truthiness test, so a
    // deliberately empty export is still an answer and not a gap to fill.
    if (key && !(key in process.env)) process.env[key] = line.slice(at + 1).trim();
  }
  // The two spellings this repo uses interchangeably: `.env` is read by Vite
  // as well, so the browser-facing names carry the same values. A suite asking
  // for either should not depend on which one the file happens to spell.
  const alias = {
    SUPABASE_URL: "VITE_SUPABASE_URL",
    SUPABASE_ANON_KEY: "VITE_SUPABASE_ANON_KEY",
  };
  for (const [plain, vite] of Object.entries(alias)) {
    if (!process.env[plain] && process.env[vite]) process.env[plain] = process.env[vite];
    if (!process.env[vite] && process.env[plain]) process.env[vite] = process.env[plain];
  }
}
