// WHAT IS WORTH SAYING ABOUT THE SKY OVER A BOOKED JOB — and nothing about
// fetching it. Andrew, 2026-09-13: *"the weather thing wasn't supposed to be,
// oh, so I could see what the weather was today. It was so you could see the
// weather on your upcoming bookings."*
//
// ---------------------------------------------------------------------------
// WHY THE RULES ARE IN A FILE OF THEIR OWN.
// ---------------------------------------------------------------------------
// Three screens read a warning (the job row, the job record, the settings
// preview) and one screen writes the thresholds. A rule written inside any one
// of them is a rule the other three re-derive, which is how the same product
// ends up saying *rain* in one place and nothing in another about one booking.
// This file has NO imports for the same reason `book/core.js` has none: it is
// the judgement, and judgement that can be dropped into a check or a second
// caller without dragging React behind it stays honest.
//
// ---------------------------------------------------------------------------
// **A THRESHOLD IS THE WHOLE FEATURE, NOT A SETTING BOLTED ON IT.**
// ---------------------------------------------------------------------------
// 110 degrees is a summer Tuesday in Phoenix and an emergency in Seattle, and
// *"only warn me if it's storming but not raining"* was his own example of the
// distinction a fixed list cannot make. So the defaults below are a starting
// point a detailer is expected to move, not an opinion this product holds.
//
// ---------------------------------------------------------------------------
// AND IT STAYS READ-ONLY — HIS REFUSAL, TWICE.
// ---------------------------------------------------------------------------
// 2026-09-06: *"I don't think there should be auto-blocking if it's rain or
// whatever."* And again on 2026-09-13, unprompted, after raising it himself:
// *"I think that's too far. I think for now, it will be good enough. It's just
// weather per booking."* Nothing here blocks a date, moves a job, warns a
// customer or sends anything. A change that does needs asking him first.

// ---------------------------------------------------------------------------
// THE SIX THINGS WORTH A WARNING, AND WHY THERE ARE NOT TWELVE.
// ---------------------------------------------------------------------------
// Each one is a different DECISION a detailer makes the night before: rain and
// storms move a mobile job, snow cancels it, wind ruins a spray, and heat is
// about the person doing the work rather than the car. Fog, humidity and cloud
// cover change nothing anybody does, so they are not here — a toggle for a
// thing that changes no decision is a row on a settings screen for ever.
//
// `text` IS SHIPPED WORDING HE CAN REPLACE — his ask, in his words: *"Ship
// preset wording, and let them write their own."* `{temp}` is the only token,
// and only the two temperature rules use it.
export const WEATHER_KINDS = [
  { key: "storm", label: "Thunderstorms", text: "Storms forecast" },
  { key: "rain", label: "Rain", text: "Rain forecast" },
  { key: "snow", label: "Snow or ice", text: "Snow or ice forecast" },
  { key: "wind", label: "High wind", text: "Windy" },
  { key: "hot", label: "Too hot", text: "{temp}° — plan for the heat" },
  { key: "cold", label: "Too cold", text: "{temp}° — too cold to work outside" },
];

// **NULL PREFS MEANS THESE, WHOLE — never field by field.** A detailer's own
// hot threshold sitting beside a default he never saw is a setting nobody
// chose wearing the face of one somebody did; the price table takes the same
// posture for the same reason.
export const WEATHER_DEFAULTS = {
  hotAbove: 95,
  coldBelow: 40,
  // The chance of rain below which nobody would change a plan. The NWS puts a
  // 20% chance on a great many dry afternoons, and a warning that fires on
  // most days is a warning nobody reads.
  rainChance: 40,
  windMph: 20,
  on: { storm: true, rain: true, snow: true, wind: false, hot: true, cold: true },
  text: {},
};

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** A stored row, or null, becomes a usable set of rules. Unknown keys are
 *  dropped and missing ones take the default, so a row written by an older
 *  version of this screen still reads. */
export function weatherPrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const on = { ...WEATHER_DEFAULTS.on };
  for (const { key } of WEATHER_KINDS) {
    if (r.on && typeof r.on[key] === "boolean") on[key] = r.on[key];
  }
  const text = {};
  for (const { key } of WEATHER_KINDS) {
    const s = r.text?.[key];
    if (typeof s === "string" && s.trim()) text[key] = s.trim().slice(0, 120);
  }
  return {
    hotAbove: num(r.hotAbove, WEATHER_DEFAULTS.hotAbove),
    coldBelow: num(r.coldBelow, WEATHER_DEFAULTS.coldBelow),
    rainChance: num(r.rainChance, WEATHER_DEFAULTS.rainChance),
    windMph: num(r.windMph, WEATHER_DEFAULTS.windMph),
    on,
    text,
  };
}

// **THE NWS'S OWN WORDS ARE THE INPUT, AND THEY ARE PROSE.** `shortForecast`
// is a sentence a meteorologist wrote — "Patchy Fog then Chance Rain Showers",
// "Slight Chance Showers And Thunderstorms" — so this matches on words rather
// than on a code, because they do not publish a code for a screen to branch
// on. Anything unmatched is simply not a warning, which is the safe direction:
// a missed warning costs a detailer a surprise, a false one costs them trust
// in every warning after it.
const SNOW = /snow|sleet|blizzard|freezing|ice|wintry|flurr/i;
const STORM = /thunder|t-?storm|storm/i;
const RAIN = /rain|shower|drizzle/i;

/** "5 to 10 mph" -> 10. Their words are a RANGE and the top of it is the one
 *  that decides whether a spray drifts, so the largest number wins. */
export function windMphOf(windSpeed) {
  const nums = String(windSpeed ?? "").match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : null;
}

/**
 * Every warning this period earns under these rules, most serious first.
 * `period` is one NWS forecast period; `prefs` comes from `weatherPrefs`.
 * Returns `[]` when there is nothing worth saying — which is most days, and is
 * the point.
 */
export function weatherWarnings(period, prefs) {
  if (!period) return [];
  const p = prefs ?? weatherPrefs(null);
  const words = `${period.shortForecast ?? ""} ${period.detailedForecast ?? ""}`;
  const chance = period.precipChance;
  const temp = period.temperature;
  const out = [];

  const say = (key, vars) => {
    const kind = WEATHER_KINDS.find((k) => k.key === key);
    const raw = p.text[key] || kind.text;
    // `shipped` + `template` let the dashboard put OUR wording through `t()`; a
    // detailer's own words are shown as typed. This file imports nothing, so it
    // cannot translate for itself.
    return { key, label: kind.label, text: raw.replace("{temp}", vars?.temp ?? ""),
      shipped: !p.text[key], template: kind.text, temp: vars?.temp ?? "" };
  };

  const snow = SNOW.test(words);
  const storm = STORM.test(words);
  // **STORM SUPPRESSES RAIN, AND THAT IS HIS EXAMPLE RATHER THAN A TIDINESS
  // RULE.** *"Only warn me if it's storming but not raining"* is only
  // expressible if the two are exclusive — otherwise switching rain off and
  // storms on still says nothing about "Showers And Thunderstorms", which is
  // how the NWS spells nearly every storm.
  const rain = !storm && !snow && RAIN.test(words);

  if (p.on.snow && snow) out.push(say("snow"));
  if (p.on.storm && storm) out.push(say("storm"));
  // The chance floor applies ONLY to plain rain. A forecast naming thunder or
  // snow is worth saying at any probability, and the NWS often gives one no
  // percentage at all — `chance == null` must not read as zero, which is the
  // `Number("")` trap `_shared/weather.ts` already records.
  if (p.on.rain && rain && (chance == null || chance >= p.rainChance)) out.push(say("rain"));

  if (p.on.hot && typeof temp === "number" && temp > p.hotAbove) out.push(say("hot", { temp }));
  if (p.on.cold && typeof temp === "number" && temp < p.coldBelow) out.push(say("cold", { temp }));

  const w = windMphOf(period.windSpeed);
  if (p.on.wind && w != null && w >= p.windMph) out.push(say("wind"));

  return out;
}
