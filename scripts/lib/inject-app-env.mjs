// SUPPLY THE APP'S SUPABASE ADDRESS TO A BROWSER CHECK WHOSE DEV SERVER STARTED WITHOUT ONE — ROADMAP 97.14.
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/<check>.mjs
//
// A belt job's server starts with no `app/.env.local` (the belt keeps env files out of job copies on purpose), so
// every page dies on `Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY` and a browser check times out at sign-in
// having measured nothing. This preload wraps the SAME Playwright module the checks load and, on every context,
// rewrites the two `import.meta.env.VITE_…` reads in the app's own modules to the root `.env`'s SUPABASE_URL and
// SUPABASE_ANON_KEY (the anon key ships in every browser bundle). The check itself runs unedited. It prints that it
// is active, and refuses to start if either value is missing rather than letting a blank page read as a result.

import { createRequire } from "node:module";

const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env;
if (!url || !key) throw new Error("inject-app-env: SUPABASE_URL / SUPABASE_ANON_KEY not set — load the root .env first. NOTHING WAS MEASURED.");

const pw = createRequire(import.meta.url)("../../app/node_modules/playwright/index.js");
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const browser = await launch(...a);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...o) => {
    const ctx = await newContext(...o);
    await ctx.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
      // A context closed with a module still in flight rejects here; unhandled, that
      // killed the whole run mid-teardown (98.11: suspend-delete-waive, shots-99-4).
      const res = await route.fetch().catch(() => null);
      if (!res) return route.abort().catch(() => {});
      const body = (await res.text())
        .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(url))
        .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(key));
      await route.fulfill({ response: res, body }).catch(() => {});
    });
    return ctx;
  };
  return browser;
};
console.log("inject-app-env: active — the app's Supabase address is supplied to every page by this preload");
