// PROBE THE WEATHER, LIVE — ROADMAP.md § FREE THIRD-PARTY SERVICES → 1 · WEATHER
//
//   node scripts/probe-forecast.mjs            # the NWS itself, no credentials
//   set -a; . ./.env; set +a                   # ...and the deployed endpoint
//   node scripts/probe-forecast.mjs
//
// **`tests/weather.test.mjs` RUNS THE MODULE AGAINST A STUB AND THIS RUNS IT
// AGAINST THE REAL THING, AND NEITHER REPLACES THE OTHER.** The stub proves the
// failure ladder, which a live API will not perform on demand; this proves the
// shape we are mapping is the shape they still send, and that the deployed
// function answers. A stub is a belief about somebody else's API written down.
//
// **THE SKIP IS PRINTED.** This repo's single most repeated failure is a
// skipped check reading exactly like a passing one, so the second half says out
// loud when it did not run and why.

// **THE ONE LIVE SECTION OF THIS SCRIPT HAD NEVER RUN - found 2026-09-13.**
// `tests/weather.test.mjs` SKIPS its § 13 saying the status mapping is
// *"proved live by scripts/probe-forecast.mjs instead"*, and this script then
// skipped its own live section for want of `SUPABASE_ANON_KEY` and exited 0.
// Two honest skip lines in a row add up to a capability nobody has ever
// checked. The key has been in the root `.env` all along; the suites load it
// through `tests/_env.mjs` and this script did not.
import "../tests/_env.mjs";

import { forecast } from "../supabase/functions/_shared/weather.ts";

let pass = 0, fail = 0, skipped = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok    ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

// Long Beach, CA — the demo business's own town, so the answer is checkable by
// eye against a forecast anybody can look up.
const LAT = 33.7701, LON = -118.1937;

console.log("\n1 · the NWS itself (no credentials needed)");
{
  const r = await forecast(LAT, LON);
  ok("1a · Long Beach answers", r.ok === true, r.ok ? "" : `reason ${r.reason} status ${r.status}`);
  if (r.ok) {
    ok("1b · periods came back", r.periods.length > 0, `${r.periods.length} periods`);
    ok("1c · the place is named", !!r.place, String(r.place));
    const p = r.periods[0];
    // **THE FIELDS WE MAP, ASSERTED ONE AT A TIME.** If the NWS renames one,
    // the module keeps working and quietly prints an empty string on a screen —
    // which is the eighth costume, and only a live probe can see it.
    ok("1d · name", typeof p.name === "string" && p.name.length > 0, p.name);
    ok("1e · temperature is a number", Number.isFinite(p.temperature), String(p.temperature));
    ok("1f · shortForecast", p.shortForecast.length > 0, p.shortForecast);
    ok("1g · windSpeed", p.windSpeed.length > 0, p.windSpeed);
    ok("1h · startTime parses", !Number.isNaN(Date.parse(p.startTime)), p.startTime);
    ok("1i · precipChance is a number or null",
      p.precipChance === null || Number.isFinite(p.precipChance), String(p.precipChance));
  }
}

console.log("\n2 · the two honest non-answers, from the live API");
{
  // London. Their 404 means US-only, and it must not read as a failure.
  const out = await forecast(51.5, -0.12);
  ok("2a · London is outside_coverage, not unavailable",
    out.ok === false && out.reason === "outside_coverage", String(out.reason));
  // Ours, and it never leaves the building.
  const bad = await forecast(999, 999);
  ok("2b · a point off the globe is bad_point", bad.ok === false && bad.reason === "bad_point");
}

console.log("\n3 · the deployed `forecast` function");
{
  const URL_ = process.env.SUPABASE_URL, ANON = process.env.SUPABASE_ANON_KEY;
  if (!URL_ || !ANON) {
    skipped += 1;
    console.log("  SKIPPED — no SUPABASE_URL / SUPABASE_ANON_KEY in the environment.");
    console.log("            Run `set -a; . ./.env; set +a` first. NOTHING ABOUT THE");
    console.log("            DEPLOYED ENDPOINT WAS CHECKED.");
  } else {
    const call = (body, token) => fetch(`${URL_}/functions/v1/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${token ?? ANON}`,
      },
      body: JSON.stringify(body),
    });

    // A stranger gets 404, never 403 — a 403 tells a prober the endpoint is real.
    const anon = await call({ lat: LAT, lon: LON });
    ok("3a · no session is refused", anon.status === 404 || anon.status === 401,
      `status ${anon.status}`);

    // The demo detailer, which every other suite signs in with.
    const auth = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: JSON.stringify({ email: "demo@detailplatform.com", password: "demo123" }),  // mail-sink: a dashboard login, never a recipient
    }).then((r) => r.json()).catch(() => ({}));

    if (!auth.access_token) {
      skipped += 1;
      console.log("  SKIPPED — could not sign in as demo@detailplatform.com; the signed-in");  // mail-sink: prose in a SKIPPED line
      console.log("            half of this probe did not run.");
    } else {
      const good = await call({ lat: LAT, lon: LON }, auth.access_token);
      const body = await good.json().catch(() => ({}));
      ok("3b · a member gets 200", good.status === 200, `status ${good.status}`);
      ok("3c · with periods", body.ok === true && Array.isArray(body.periods) && body.periods.length > 0,
        `${(body.periods || []).length} periods`);

      const bad = await call({ lat: "nowhere", lon: "nowhere" }, auth.access_token);
      ok("3d · a bad point is 400", bad.status === 400, `status ${bad.status}`);

      const out = await call({ lat: 51.5, lon: -0.12 }, auth.access_token);
      const outBody = await out.json().catch(() => ({}));
      // 200, because the request SUCCEEDED and the answer is "not here".
      ok("3e · outside coverage is a 200 saying so",
        out.status === 200 && outBody.ok === false && outBody.reason === "outside_coverage",
        `status ${out.status} reason ${outBody.reason}`);
    }
  }
}

console.log(`\nprobe-forecast: ${pass} passed, ${fail} failed, ${skipped} skipped`);
process.exit(fail ? 1 : 0);
