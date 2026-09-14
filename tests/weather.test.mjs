// THE NWS SEAM, CHECKED BY RUNNING IT — 2026-09-13
//
// ROADMAP.md § FREE THIRD-PARTY SERVICES → 1 · WEATHER. Two requirements in
// that spec are the reason this file exists, and both are behaviour rather than
// spelling:
//
//   1. **The User-Agent is required, not politeness.** Measured against the
//      live API while writing the module: `curl -H "User-Agent:"
//      https://api.weather.gov/points/33.7701,-118.1937` returns **403**. So the
//      stub below asserts the header reaches EVERY request, not that the string
//      appears in the file.
//   2. **The base URL and the User-Agent live behind ONE module**, because their
//      docs warn a key may arrive later. § 9 counts the files that name the host
//      and fails if there is ever more than one.
//
// **THIS IMPORTS THE REAL FUNCTION AND CALLS IT**, with a stubbed `fetch`, the
// way `gateway-retry.test.mjs` does — CLAUDE.md trap (k): a check that greps
// source asserts how something is WRITTEN, not what it DOES, and three of one
// day's four false failures were exactly that.
//
// **BASELINED BY BREAKING WHAT IT GUARDS**, per docs/BAR.md. Six breaks, six
// red runs, listed in this file's commit message: deleting the User-Agent from
// HEADERS, dropping `round4`, returning `ok:true` on an empty `periods`,
// collapsing `outside_coverage` into `unavailable`, flattening a null
// `precipChance` to 0, and pointing BASE at open-meteo. A guard that cannot be
// made to fail is not a guard.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { forecast } from "../supabase/functions/_shared/weather.ts";

let pass = 0, fail = 0, skipped = 0;
const ok = (name, cond, detail = "") => {
  if (cond) pass++;
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

// --- the stub -------------------------------------------------------------
// Records every URL asked for and every header sent, and answers from a script
// keyed on a substring of the URL. Anything unscripted is a hard failure rather
// than a default 200, because a silently-defaulted call is how a check passes
// over a request nobody meant to make.
const stub = (script) => {
  const seen = [];
  const f = (url, init) => {
    seen.push({ url, headers: (init && init.headers) || {} });
    const key = Object.keys(script).find((k) => url.includes(k));
    if (!key) return Promise.reject(new Error(`unscripted URL: ${url}`));
    const r = script[key];
    if (r.throws) return Promise.reject(new Error("network down"));
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => (r.bad ? Promise.reject(new Error("not json")) : Promise.resolve(r.body)),
    });
  };
  f.seen = seen;
  return f;
};

const POINT_BODY = {
  properties: {
    // **THE HOURLY URL IS THE ONE THE PRODUCT FOLLOWS.** The twelve-hour
    // `forecast` stays in the fixture precisely so § 14 can prove it is
    // ignored — a point body carrying only that one must not silently fall
    // back to it, because the half-day HIGH is the bug Andrew found.
    forecast: "https://api.weather.gov/gridpoints/LOX/155,32/forecast",
    forecastHourly: "https://api.weather.gov/gridpoints/LOX/155,32/forecast/hourly",
    relativeLocation: { properties: { city: "Long Beach", state: "CA" } },
  },
};
const PERIOD = {
  number: 1, name: "Tonight", startTime: "2026-09-12T21:00:00-07:00",
  endTime: "2026-09-13T06:00:00-07:00", isDaytime: false, temperature: 69,
  temperatureUnit: "F", probabilityOfPrecipitation: { unitCode: "wmoUnit:percent", value: 1 },
  windSpeed: "5 to 10 mph", windDirection: "SW", shortForecast: "Patchy Fog",
  detailedForecast: "Patchy fog after 11pm.",
};
const happy = (periods) => stub({
  "/points/": { status: 200, body: POINT_BODY },
  "/gridpoints/": { status: 200, body: { properties: { periods } } },
});

// --- 1 · THE USER-AGENT REACHES EVERY REQUEST ------------------------------
// The one that is a 403 if it is missing. Asserted on BOTH calls, because the
// module makes two and a header set on only the first is a bug that works in
// testing and fails in the grid lookup.
{
  const f = happy([PERIOD]);
  await forecast(33.7701, -118.1937, f);
  ok("1a · two requests are made", f.seen.length === 2, `made ${f.seen.length}`);
  const withUa = f.seen.filter((s) => String(s.headers["User-Agent"] || "").trim().length > 0);
  ok("1b · every request carries a User-Agent", withUa.length === f.seen.length,
    `${withUa.length} of ${f.seen.length}`);
  ok("1c · it identifies this application", f.seen.every((s) =>
    String(s.headers["User-Agent"]).includes("detailingplatform.com")));
}

// --- 2 · THE HOST IS THE NWS ----------------------------------------------
{
  const f = happy([PERIOD]);
  await forecast(33.7701, -118.1937, f);
  ok("2 · both calls go to api.weather.gov",
    f.seen.every((s) => s.url.startsWith("https://api.weather.gov/")));
}

// --- 3 · FOUR DECIMAL PLACES, WHICH IS A MEASURED REDIRECT -----------------
// /points/33.770123,-118.193765 answers 301 to the 4-place form. `fetch`
// follows it, so getting this wrong is invisible and costs a round trip every
// single call.
{
  const f = happy([PERIOD]);
  await forecast(33.770123, -118.193765, f);
  ok("3a · the point is rounded to 4 places",
    f.seen[0].url.endsWith("/points/33.7701,-118.1938"), f.seen[0].url);
  const f2 = happy([PERIOD]);
  await forecast("33.7701", "-118.1937", f2);
  ok("3b · numeric strings are accepted", f2.seen.length === 2);
}

// --- 4 · THE HAPPY PATH, AND THE SHAPE IT HANDS BACK -----------------------
{
  const r = await forecast(33.7701, -118.1937, happy([PERIOD]));
  ok("4a · ok", r.ok === true);
  ok("4b · the place is the grid's own town", r.place === "Long Beach, CA", String(r.place));
  ok("4c · one period", r.ok && r.periods.length === 1);
  const p = r.ok && r.periods[0];
  ok("4d · the fields a screen needs survive the mapping",
    p && p.name === "Tonight" && p.temperature === 69 && p.isDaytime === false &&
    p.windSpeed === "5 to 10 mph" && p.shortForecast === "Patchy Fog" &&
    p.startTime === "2026-09-12T21:00:00-07:00");
  ok("4e · the precipitation chance is unwrapped from its object", p && p.precipChance === 1);
}

// --- 5 · A MISSING RELATIVE LOCATION IS null, NOT A CRASH AND NOT "" -------
{
  const f = stub({
    "/points/": { status: 200, body: { properties: { forecastHourly: POINT_BODY.properties.forecastHourly } } },
    "/gridpoints/": { status: 200, body: { properties: { periods: [PERIOD] } } },
  });
  const r = await forecast(33.7701, -118.1937, f);
  ok("5 · no relativeLocation gives place null and still a forecast",
    r.ok === true && r.place === null);
}

// --- 6 · US-ONLY IS AN ANSWER, NOT A FAILURE ------------------------------
// The NWS answers 404 with `problems/InvalidPoint` for London. Collapsing that
// into `unavailable` tells the screen to retry for ever something that will
// never work.
{
  const f = stub({ "/points/": { status: 404, body: {} } });
  const r = await forecast(51.5, -0.12, f);
  ok("6a · a 404 point is outside_coverage", r.ok === false && r.reason === "outside_coverage",
    String(r.reason));
  ok("6b · it is NOT unavailable", r.reason !== "unavailable");
  ok("6c · a final answer is fetched once, not retried", f.seen.length === 1,
    `${f.seen.length} calls`);
}

// --- 7 · A NON-ANSWER IS unavailable, AND IS RETRIED ----------------------
{
  const f = stub({ "/points/": { status: 503, body: {} } });
  const r = await forecast(33.7701, -118.1937, f);
  ok("7a · a 5xx is unavailable", r.ok === false && r.reason === "unavailable");
  ok("7b · and it was retried three times", f.seen.length === 3, `${f.seen.length} calls`);

  const t = stub({ "/points/": { throws: true } });
  const r2 = await forecast(33.7701, -118.1937, t);
  ok("7c · a network failure is unavailable, not a crash",
    r2.ok === false && r2.reason === "unavailable");

  const b = stub({ "/points/": { status: 200, bad: true } });
  const r3 = await forecast(33.7701, -118.1937, b);
  ok("7d · a 200 that is not JSON is unavailable", r3.ok === false && r3.reason === "unavailable");

  // The second call can fail on its own, and it is the same honest answer.
  const g = stub({
    "/points/": { status: 200, body: POINT_BODY },
    "/gridpoints/": { status: 500, body: {} },
  });
  const r4 = await forecast(33.7701, -118.1937, g);
  ok("7e · a grid lookup that fails is unavailable", r4.ok === false && r4.reason === "unavailable");
}

// --- 8 · THERE IS NO CHEERFUL EMPTY --------------------------------------
// FOUND.md's seventh costume, and the fault `available-slots` shipped: a
// success that carries nothing looks exactly like a success that carries an
// answer. `ok: true` with zero periods must be impossible.
{
  for (const [label, periods] of [["an empty array", []], ["a missing key", undefined], ["not an array", {}]]) {
    const f = stub({
      "/points/": { status: 200, body: POINT_BODY },
      "/gridpoints/": { status: 200, body: { properties: { periods } } },
    });
    const r = await forecast(33.7701, -118.1937, f);
    ok(`8 · ${label} of periods is unavailable, never an empty success`,
      r.ok === false && r.reason === "unavailable", `got ${JSON.stringify(r).slice(0, 80)}`);
  }
}

// --- 9 · A POINT WE CANNOT USE NEVER REACHES THE NWS ---------------------
// Their 404 for 999,999 is the SAME 404 as London's, so validating on our side
// first is what keeps "off the globe" and "we do not cover Canada" apart.
{
  for (const [la, lo, label] of [
    [999, 999, "off the globe"], ["abc", -118, "not a number"],
    [null, null, "null"], [undefined, undefined, "missing"], [91, 0, "latitude past the pole"],
    [0, 181, "longitude past the line"],
  ]) {
    const f = happy([PERIOD]);
    const r = await forecast(la, lo, f);
    ok(`9 · ${label} is bad_point`, r.ok === false && r.reason === "bad_point", String(r.reason));
    ok(`9 · ${label} makes no request at all`, f.seen.length === 0, `${f.seen.length} calls`);
  }
  // 0,0 is in the Atlantic and IS a valid point — their 404, not ours. The
  // falsy-zero bug this catches is the classic one.
  const f = stub({ "/points/": { status: 404, body: {} } });
  const r = await forecast(0, 0, f);
  ok("9 · 0,0 is a real point and is asked about", f.seen.length === 1 && r.reason === "outside_coverage");
}

// --- 10 · A FORECAST URL OUT OF A RESPONSE BODY IS NOT FOLLOWED BLINDLY --
{
  for (const [label, url] of [
    ["another host", "https://example.com/forecast"],
    ["missing", undefined],
    ["not a string", 42],
  ]) {
    const f = stub({
      "/points/": { status: 200, body: { properties: { forecastHourly: url } } },
      "example.com": { status: 200, body: { properties: { periods: [PERIOD] } } },
    });
    const r = await forecast(33.7701, -118.1937, f);
    ok(`10 · a forecast URL that is ${label} is unavailable`,
      r.ok === false && r.reason === "unavailable");
    ok(`10 · and ${label} is never fetched`, f.seen.length === 1, `${f.seen.length} calls`);
  }
}

// --- 11 · A NULL CHANCE OF RAIN STAYS NULL ------------------------------
// "0% chance of rain" and "they did not forecast one" are different sentences.
// Flattening one into the other prints a number nobody forecast.
{
  const r = await forecast(33.7701, -118.1937, happy([
    { ...PERIOD, probabilityOfPrecipitation: { value: null } },
    { ...PERIOD, probabilityOfPrecipitation: { value: 0 } },
    { ...PERIOD, probabilityOfPrecipitation: undefined },
  ]));
  ok("11a · a null chance stays null", r.ok && r.periods[0].precipChance === null);
  ok("11b · a real zero stays 0", r.ok && r.periods[1].precipChance === 0);
  ok("11c · a missing object is null", r.ok && r.periods[2].precipChance === null);
}

// --- 12 · ONE MODULE HOLDS THE HOST, AND OPEN-METEO IS NOWHERE ----------
// The roadmap's own requirement — *the base URL and the User-Agent go behind
// ONE small module* — and the one rejection most likely to be quietly undone by
// somebody who only sees the price. This asks WHICH HOST THE PRODUCT CALLS,
// which is behaviour; it is not a spelling check on a comment.
{
  const walk = (dir) => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = [
    ...walk("supabase/functions"),
    ...walk("app/src").filter((p) => /\.(js|jsx|ts|tsx)$/.test(p)),
  ];
  ok("12 · files scanned", files.length > 50, `${files.length} files`);

  const src = files.map((p) => [p, readFileSync(p, "utf8")]);
  const holders = src.filter(([, t]) => t.includes("api.weather.gov")).map(([p]) => p);
  ok("12a · exactly one file names the NWS host", holders.length === 1,
    holders.join(", ") || "none");
  ok("12b · and it is the shared module",
    holders[0] && holders[0].replace(/\\/g, "/").endsWith("_shared/weather.ts"), String(holders[0]));

  // **THE HOST, NOT THE WORD.** `_shared/weather.ts` names Open-Meteo in a
  // comment recording WHY it is banned, and a check that fails on the ban
  // notice would delete the reason the ban exists.
  const meteo = src.filter(([, t]) => /open-meteo\.com/i.test(t)).map(([p]) => p);
  ok("12c · open-meteo.com is called from nowhere — its free tier is non-commercial",
    meteo.length === 0, meteo.join(", "));
}

// --- 14 · THE HOUR, NEVER THE HALF-DAY -----------------------------------
// **ANDREW, 2026-09-13: a 9 AM job read 82° and the 2 PM job beside it read
// 77° — hotter in the morning than the afternoon, which is backwards.** Both
// numbers were the TWELVE-HOUR period's `temperature`, which the NWS documents
// as that half-day's HIGH, so neither was the temperature at the hour the job
// starts and the warning beside each was judged on the same wrong figure.
// `properties.forecastHourly` is the fix, and these two checks are what would
// have caught it: the hourly URL is the one followed, and a point body offering
// ONLY the twelve-hour URL fails silent rather than falling back to it.
{
  const urls = (x) => x.seen.map((c) => c.url).join(" ");
  const f = stub({
    "/points/": { status: 200, body: POINT_BODY },
    "/gridpoints/": { status: 200, body: { properties: { periods: [PERIOD] } } },
  });
  const r = await forecast(33.7701, -118.1937, f);
  ok("14a · the forecast is read", r.ok === true);
  ok("14b · and the URL followed is the HOURLY one",
    f.seen.some((c) => c.url.endsWith("/forecast/hourly")), urls(f));
  ok("14c · the twelve-hour URL is never fetched",
    !f.seen.some((c) => c.url.endsWith("/gridpoints/LOX/155,32/forecast")), urls(f));

  // NO FALLBACK. A fallback here restores the day high on exactly the points
  // where nobody would notice, which is worse than no forecast at all.
  const only12 = stub({
    "/points/": { status: 200, body: { properties: { forecast: POINT_BODY.properties.forecast } } },
    "/gridpoints/": { status: 200, body: { properties: { periods: [PERIOD] } } },
  });
  const r2 = await forecast(33.7701, -118.1937, only12);
  ok("14d · a point with only the twelve-hour URL is unavailable, not a day high",
    r2.ok === false && r2.reason === "unavailable");
  ok("14e · and nothing is fetched off it", only12.seen.length === 1,
    `${only12.seen.length} calls`);
}


// --- 13 · THE ENDPOINT'S THREE FAILURES ARE THREE STATUSES -------------
// There is no Deno here, so the function body cannot be run. The honest thing
// is to say so rather than to grep it and call that a pass.
skipped += 1;
console.log("  SKIPPED  13 · forecast/index.ts status mapping — needs Deno; " +
  "proved live by scripts/probe-forecast.mjs instead");

console.log(`\nweather: ${pass} passed, ${fail} failed, ${skipped} skipped`);
process.exit(fail ? 1 : 0);
