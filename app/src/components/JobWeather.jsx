// THE SKY OVER ONE BOOKED JOB — on the row, and inside the record.
//
// Andrew, 2026-09-13, on where it belongs: *"in the gap between the customer
// name / vehicle count and the price"*, and *"also inside the booking
// details"*. And on how loud it is allowed to be: *"just a little one"* — not a
// banner, not a modal, not an alert that takes over.
//
// ---------------------------------------------------------------------------
// **IT TAKES A PERIOD AS A PROP AND FETCHES NOTHING.**
// ---------------------------------------------------------------------------
// `useJobWeather` is called ONCE by the list, and each row is handed its own
// answer. A component that fetched for itself would be one address lookup per
// row against a budget of 3,000 a day shared by every tenant — which is the
// one way this feature could cost real money.
//
// ---------------------------------------------------------------------------
// **A WARNING IS NOT `--bad`, AND THAT IS DELIBERATE.**
// ---------------------------------------------------------------------------
// CLAUDE.md § SCREEN RULES: `--bad` means *this destroys something* in this
// product, consistently — it is on Delete and on nothing else that is merely
// unwelcome. Rain on Thursday is not destruction. So a warned chip is simply
// drawn at FULL text contrast where a quiet one is muted, and the icon says
// which kind it is. The difference is visible at a glance and spends no colour
// this product has reserved for something worse.
//
// AND THERE IS NO "WE DON'T KNOW" STATE. A booking past the forecast horizon,
// an address nothing could find, a service that was down — all render null.
// `lib/jobWeather.js` has the reasoning; the short version is that a column of
// *unknown* on every job three weeks out is noise, and silence is honest.

import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow,
  CloudSun, Moon, Snowflake, Sun, ThermometerSnowflake, ThermometerSun, Wind,
} from "lucide-react";
import { weatherWarnings } from "../lib/weather.js";
import { t } from "../lib/appI18n.js";

// ---------------------------------------------------------------------------
// **ONE ICON PER WARNING KIND, ALL SIX DIFFERENT — Andrew, 2026-09-13.**
// ---------------------------------------------------------------------------
// *"Separate graphics and icons for each one."* Hot and cold shared a plain
// thermometer until then, on the reasoning that the number beside it already
// said which — but a detailer SCANNING a list is reading the glyph and not the
// number, and two warnings that draw identically are one warning as far as a
// glance is concerned. The six here are the six toggles on the Weather screen,
// one to one.
const WARN_ICONS = {
  storm: CloudLightning, rain: CloudRain, snow: Snowflake,
  wind: Wind, hot: ThermometerSun, cold: ThermometerSnowflake,
};

// ---------------------------------------------------------------------------
// **AND EVERY BOOKING SHOWS ITS SKY, WARNING OR NO WARNING — his correction on
// the same day, and it is the bigger half.**
// ---------------------------------------------------------------------------
// *"I still wanted to show the weather for every day. I just wanted [the
// warning] to be, like, extra… every single one I want to see kind of the
// weather, like, it'll be sunny, cloudy, rainy, the temperature at the specific
// time that I'm going in the specific location."*
//
// The first build drew a generic sun on every unwarned job — so a quiet row
// carried a temperature and a decoration, and the CONDITION, which is half of
// what he asked for, was only visible when something was wrong with it.
//
// **FIRST MATCH WINS AND THE ORDER IS THE POINT.** The NWS writes "Partly
// Sunny", "Mostly Cloudy", "Chance Rain Showers" — every one of which contains
// a word a later rule also matches, so a set of independent tests would draw
// "Mostly Sunny" as sun and "Slight Chance Rain Showers" as rain-or-sun
// depending on nothing. Precipitation is tested before cover, and cover before
// clear, because the more specific fact is the one worth a glyph.
const CONDITIONS = [
  [/thunder|tstorm/i, () => CloudLightning],
  [/snow|sleet|ice|icy|flurr|blizzard|wintry/i, () => CloudSnow],
  [/drizzle/i, () => CloudDrizzle],
  [/rain|shower/i, () => CloudRain],
  [/fog|haze|mist|smoke/i, () => CloudFog],
  [/wind|breezy|blustery/i, () => Wind],
  // "Partly"/"Mostly" is the sky with BOTH in it, so it keeps the paired glyph
  // whichever noun follows — Partly Cloudy and Mostly Sunny are one picture.
  [/partly|mostly/i, (day) => (day ? CloudSun : CloudMoon)],
  [/cloud|overcast/i, () => Cloud],
];

/** The glyph for the sky itself. Their words are all we have — there is no
 *  code in an NWS period — so this reads `shortForecast`, which is the phrase
 *  the record prints underneath in full. */
function conditionIcon(period) {
  const words = String(period.shortForecast ?? "");
  const day = period.isDaytime !== false;
  for (const [re, pick] of CONDITIONS) if (re.test(words)) return pick(day);
  return day ? Sun : Moon;
}

// OUR shipped wording is translated; a detailer's own typed words are not (2.12).
const warnText = (w) => (w.shipped ? t(w.template, { temp: w.temp }) : w.text);

export default function JobWeather({ period, prefs, full = false, busy = false }) {
  // ---------------------------------------------------------------------------
  // **THE ONE EXCEPTION TO "NO WE-DON'T-KNOW STATE", AND IT IS NARROW ON
  // PURPOSE — the unnumbered Wave 14 item, 2026-09-24.**
  // ---------------------------------------------------------------------------
  // Everything the comment above says still holds: a job past the horizon, an
  // address nothing could find, a service that was down — all render nothing,
  // because *unknown* on every row is a column of noise.
  //
  // A REFUSED LOOKUP IS DIFFERENT IN TWO WAYS A PERSON CAN FEEL. It clears on
  // its own, so there is something true to say about the future; and it
  // happens to a RUN of records at once, so the detailer sees the weather stop
  // working rather than one quiet job. Without a line they are looking at a
  // feature that appears to be broken.
  //
  // **AND IT IS THE RECORD ONLY.** `full` is the booking someone opened and is
  // reading. A row is scanned, and a sentence on twenty scanned rows is the
  // banner Andrew asked this not to become.
  if (!period) {
    return full && busy
      ? <p className="muted jw-none">{t("No weather for this address yet. Address lookups are busy right now; it comes back on its own.")}</p>
      : null;
  }
  const warnings = weatherWarnings(period, prefs);
  const first = warnings[0];
  const warned = warnings.length > 0;
  // A WARNED ROW SHOWS THE WARNING'S OWN GLYPH, NOT THE SKY'S. On a wet or
  // snowy job they are the same picture anyway; on a hot clear one the
  // thermometer is the fact that changes what the detailer does, and two
  // glyphs on one row is the banner he asked this not to become. The record
  // below carries the condition sentence and every warning in full.
  const Icon = first ? WARN_ICONS[first.key] : conditionIcon(period);

  if (!full) {
    return (
      <span className={`jw${warned ? " warned" : ""}`} title={first ? warnText(first) : period.shortForecast}>
        {/* THE GLYPH IS ITS OWN BOX so a warned chip can invert it into a
            filled disc — shape as well as colour, which is what makes a
            warning findable while scrolling rather than findable while
            reading. `theme.css` § .jw carries the reasoning and the reason it
            is not `--bad`. */}
        <span className="jw-i"><Icon size={15} strokeWidth={2} aria-hidden="true" /></span>
        <span className="jw-t">{period.temperature}°</span>
        {/* THE WORD ONLY WHEN THERE IS ONE. A row is scanned, not read, so a
            quiet job gets a number and nothing else; a job worth a second
            thought gets one word beside it. Two warnings on one job still show
            one word — the most serious, which `weatherWarnings` orders first —
            because the record is where the rest of them belong. */}
        {first && <span className="jw-w">{t(first.label)}</span>}
      </span>
    );
  }

  return (
    <div className="jw-full">
      <p className={warned ? "jw-line warned" : "jw-line"}>
        <span className="jw-i"><Icon size={16} strokeWidth={2} aria-hidden="true" /></span>
        {/* THEIR WORDS FOR THE SKY, NOT OURS. `shortForecast` and `name` are
            the National Weather Service's own phrases and do not go through
            `t()`: they arrive in English from a US government service, and
            rewriting them into a catalogue would be inventing a forecast. The
            numbers are numbers and the words around them are ours. */}
        {/* AN HOURLY PERIOD HAS NO `name` — the twelve-hour one was called
            "Tuesday" and this one is simply the hour the job starts, which the
            row above it already says. Empty parts are dropped rather than
            printed as a leading separator. */}
        <span>{[period.name, `${period.temperature}°`, period.shortForecast].filter(Boolean).join(" · ")}</span>
      </p>
      {/* TEN, NOT ZERO. The NWS puts 1-4% on a great many cloudless afternoons,
          and *"4% chance of rain"* under a forecast that says Mostly Sunny is a
          line that costs a reader something and tells them nothing. Below ten,
          the shortForecast above has already said it. */}
      {period.precipChance != null && period.precipChance >= 10 && (
        <p className="muted">{t("{pct}% chance of rain", { pct: period.precipChance })}</p>
      )}
      {warnings.map((w) => (
        <p className="jw-warn" key={w.key}>{warnText(w)}</p>
      ))}
    </div>
  );
}
