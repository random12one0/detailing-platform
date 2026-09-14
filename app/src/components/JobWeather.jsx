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
  CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Thermometer, Wind,
} from "lucide-react";
import { weatherWarnings } from "../lib/weather.js";
import { t } from "../lib/appI18n.js";

// One icon per warning, and a default for a job with nothing to say. The
// temperature warnings share a thermometer because the distinction that
// matters (too hot, too cold) is already in the number beside it.
const ICONS = {
  storm: CloudLightning, rain: CloudRain, snow: CloudSnow,
  wind: Wind, hot: Thermometer, cold: Thermometer,
};

export default function JobWeather({ period, prefs, full = false }) {
  if (!period) return null;
  const warnings = weatherWarnings(period, prefs);
  const first = warnings[0];
  const Icon = first ? ICONS[first.key] : (period.isDaytime ? Sun : CloudSun);
  const warned = warnings.length > 0;

  if (!full) {
    return (
      <span className={`jw${warned ? " warned" : ""}`} title={first ? first.text : period.shortForecast}>
        <Icon size={15} strokeWidth={2} aria-hidden="true" />
        <span className="jw-t">{period.temperature}°</span>
        {/* THE WORD ONLY WHEN THERE IS ONE. A row is scanned, not read, so a
            quiet job gets a number and nothing else; a job worth a second
            thought gets one word beside it. Two warnings on one job still show
            one word — the most serious, which `weatherWarnings` orders first —
            because the record is where the rest of them belong. */}
        {first && <span className="jw-w">{first.label}</span>}
      </span>
    );
  }

  return (
    <div className="jw-full">
      <p className={warned ? "jw-line warned" : "jw-line"}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
        {/* THEIR WORDS FOR THE SKY, NOT OURS. `shortForecast` and `name` are
            the National Weather Service's own phrases and do not go through
            `t()`: they arrive in English from a US government service, and
            rewriting them into a catalogue would be inventing a forecast. The
            numbers are numbers and the words around them are ours. */}
        <span>{period.name} · {period.temperature}° · {period.shortForecast}</span>
      </p>
      {/* TEN, NOT ZERO. The NWS puts 1-4% on a great many cloudless afternoons,
          and *"4% chance of rain"* under a forecast that says Mostly Sunny is a
          line that costs a reader something and tells them nothing. Below ten,
          the shortForecast above has already said it. */}
      {period.precipChance != null && period.precipChance >= 10 && (
        <p className="muted">{t("{pct}% chance of rain", { pct: period.precipChance })}</p>
      )}
      {warnings.map((w) => (
        <p className="jw-warn" key={w.key}>{w.text}</p>
      ))}
    </div>
  );
}
