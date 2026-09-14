// WHEN A BOOKING GETS A WEATHER WARNING — checked by RUNNING the rules.
//
// `tests/weather.test.mjs` covers the NWS seam (the server half). This covers
// `app/src/lib/weather.js`, the judgement half — which of a forecast's facts
// are worth interrupting a detailer about, under that detailer's own
// thresholds.
//
// **IT IMPORTS THE REAL FUNCTION AND CALLS IT.** CLAUDE.md trap (k): a check
// that greps source asserts how something is WRITTEN, not what it DOES, and
// three of one day's four false failures were exactly that. `weather.js` has no
// imports of any kind — the same discipline `book/core.js` keeps — so Node can
// load it straight out of `app/src` with no bundler and no browser.
//
// BASELINED BY BREAKING IT, 2026-09-13, before it was believed: removing the
// storm-suppresses-rain clause turned two of these red. A green result from an
// instrument nobody has checked is worth less than no result.

import { weatherPrefs, weatherWarnings, windMphOf } from "../app/src/lib/weather.js";

let pass = 0;
let fail = 0;
const check = (name, ok) => {
  if (ok) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}`); }
};

const D = weatherPrefs(null);
const keys = (period, prefs = D) => weatherWarnings(period, prefs).map((w) => w.key).join(",");

const sunny = { shortForecast: "Sunny", temperature: 72, precipChance: 0, windSpeed: "5 mph" };

console.log("\n1 · AN ORDINARY DAY SAYS NOTHING, which is most days and is the point");
check("1a · a clear 72° earns no warning", keys(sunny) === "");
check("1b · no forecast at all is not a warning", keys(null) === "");

console.log("\n2 · A STORM SUPPRESSES RAIN — his own example, and the whole reason");
// *"Only warn me if it's storming but not raining"* is only expressible if the
// two are exclusive: the NWS spells nearly every storm "Showers And
// Thunderstorms", so a rain rule that also matched it would fire anyway.
check("2a · Showers And Thunderstorms is a storm, not rain",
  keys({ ...sunny, shortForecast: "Showers And Thunderstorms", precipChance: 70 }) === "storm");
{
  const stormOnly = weatherPrefs({ on: { rain: false, storm: true } });
  check("2b · storms on, rain off: the storm still fires",
    keys({ ...sunny, shortForecast: "Showers And Thunderstorms", precipChance: 70 }, stormOnly) === "storm");
  check("2c · storms on, rain off: plain rain stays quiet",
    keys({ ...sunny, shortForecast: "Rain Showers", precipChance: 90 }, stormOnly) === "");
}
check("2d · snow outranks rain too",
  keys({ ...sunny, shortForecast: "Rain And Snow Likely", temperature: 34, precipChance: 80 }).startsWith("snow"));

console.log("\n3 · THE CHANCE FLOOR APPLIES TO PLAIN RAIN AND NOTHING ELSE");
check("3a · 70% rain is over the 40% floor", keys({ ...sunny, shortForecast: "Chance Rain Showers", precipChance: 70 }) === "rain");
check("3b · 20% rain is under it", keys({ ...sunny, shortForecast: "Slight Chance Rain Showers", precipChance: 20 }) === "");
// **`null` IS NOT ZERO.** The NWS often forecasts no percentage at all, and
// `Number("")` being 0 is the trap `_shared/weather.ts` already records.
check("3c · rain with NO percentage still warns", keys({ ...sunny, shortForecast: "Rain Likely", precipChance: null }) === "rain");

console.log("\n4 · THE THRESHOLDS ARE THE FEATURE, so they have to actually move");
check("4a · 110° clears the default 95", keys({ ...sunny, temperature: 110 }) === "hot");
check("4b · 90° does not", keys({ ...sunny, temperature: 90 }) === "");
check("4c · a detailer who sets 85 gets warned at 90",
  keys({ ...sunny, temperature: 90 }, weatherPrefs({ hotAbove: 85 })) === "hot");
check("4d · 30° clears the default 40", keys({ ...sunny, temperature: 30 }) === "cold");
check("4e · hot switched off says nothing at 110",
  keys({ ...sunny, temperature: 110 }, weatherPrefs({ on: { hot: false } })) === "");

console.log("\n5 · WIND IS OFF BY DEFAULT, and its range takes the TOP number");
check("5a · 30 mph with wind off is silent", keys({ ...sunny, windSpeed: "10 to 30 mph" }) === "");
check("5b · wind on fires at 30", keys({ ...sunny, windSpeed: "10 to 30 mph" }, weatherPrefs({ on: { wind: true } })) === "wind");
check("5c · a range reads its top", windMphOf("5 to 20 mph") === 20);
check("5d · 'Calm' is not a speed", windMphOf("Calm") === null);

console.log("\n6 · A DETAILER'S OWN WORDING REPLACES OURS, and {temp} fills in");
{
  const own = weatherPrefs({ hotAbove: 90, text: { hot: "{temp}F. Start early." } });
  const w = weatherWarnings({ ...sunny, temperature: 99 }, own)[0];
  check("6a · his sentence is used", w?.text === "99F. Start early.");
  const shipped = weatherWarnings({ ...sunny, temperature: 99 }, weatherPrefs({ hotAbove: 90 }))[0];
  check("6b · ours is used when he has not written one", shipped?.text === "99° — plan for the heat");
}

console.log("\n7 · NULL PREFS MEANS THE DEFAULTS WHOLE, never field by field");
{
  // A half-merged row — his hot threshold beside a default he never saw — is a
  // setting nobody chose wearing the face of one somebody did.
  const partial = weatherPrefs({ hotAbove: 85 });
  check("7a · the value he set is his", partial.hotAbove === 85);
  check("7b · everything he did not set is the default", partial.coldBelow === 40 && partial.rainChance === 40);
  check("7c · rubbish in the column does not throw", weatherPrefs("not an object").hotAbove === 95);
  check("7d · a non-numeric threshold falls back", weatherPrefs({ hotAbove: "hot" }).hotAbove === 95);
}

console.log("\n8 · THE NUMBER SHOWN AND THE NUMBER JUDGED ARE ONE NUMBER");
// **ANDREW SAW A ROW READING 77° BESIDE "Too hot" UNDER A THRESHOLD OF 80 —
// 2026-09-13.** The cause was upstream (the twelve-hour forecast hands back the
// half-day HIGH, so both the chip and the rule read a number that was not the
// temperature at the booking's hour), but the invariant a screen must never
// break is this one: whatever temperature a row PRINTS, a hot warning may only
// sit beside it when that printed number is at or above the detailer's own
// threshold. This holds it from the judgement side.
{
  const hot80 = weatherPrefs({ hotAbove: 80 });
  const has = (temp) => weatherWarnings({ ...sunny, temperature: temp }, hot80)
    .some((w) => w.key === "hot");
  check("8a · 77° under a threshold of 80 is NOT too hot", has(77) === false);
  check("8b · 79° — one degree under — is NOT too hot", has(79) === false);
  check("8c · 80° is the threshold and does warn", has(80) === true);
  check("8d · 82° over the threshold warns", has(82) === true);

  // AND THE PRINTED NUMBER IS THE JUDGED NUMBER. `JobWeather` renders
  // `period.temperature` and passes the SAME period to `weatherWarnings`, so
  // the sentence carries the figure the chip shows; a rule reading anything
  // else would print a threshold-crossing number beside a row showing another.
  const w = weatherWarnings({ ...sunny, temperature: 96 }, hot80).find((x) => x.key === "hot");
  check("8e · the warning quotes the same temperature it judged", w?.text.startsWith("96°"));
}

console.log(`\nweather-warnings: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
