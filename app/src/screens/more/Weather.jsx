// WHEN THE WEATHER IS WORTH MENTIONING — Andrew, 2026-09-13.
//
// *"The detailer configures it: their own temperature thresholds — warn above
// X, warn below Y — plus a few weather types each with an on/off toggle. Only
// warn me if it's storming but not raining. Ship preset wording, and let them
// write their own."*
//
// ---------------------------------------------------------------------------
// **WHY A THRESHOLD SCREEN EXISTS AT ALL, WHICH IS THE THING NOT TO LOSE.**
// ---------------------------------------------------------------------------
// 110 degrees is a summer Tuesday in Phoenix and an emergency in Seattle. A
// fixed list would be wrong for most of the country most of the year, and a
// warning that fires on an ordinary day is a warning nobody reads by the
// second week. Every default here is a starting point, not an opinion.
//
// ---------------------------------------------------------------------------
// THE SHAPE, AND IT IS THE EXHAUSTION TEST RATHER THAN A PREFERENCE.
// ---------------------------------------------------------------------------
// Six identical switch rows is the monotony CLAUDE.md § SCREEN RULES names —
// the same block forty times is what made the advanced money screen feel like
// work. So the four SKY rows are switches, the two TEMPERATURE rows carry
// their own number beside the switch, and the wording — which almost nobody
// will change — is behind one `Folded` instead of six always-open text boxes.
//
// ---------------------------------------------------------------------------
// AND IT CANNOT BLOCK A DAY, WHICH HE RAISED AND THEN REFUSED HIMSELF.
// ---------------------------------------------------------------------------
// *"I think that's too far. I think for now, it will be good enough. It's just
// weather per booking."* There is deliberately no stub for it here — an
// "automatically block" switch that does nothing is worse than the absence.

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Folded, Group, Setting, Stepper, Switch } from "../../components/controls.jsx";
import { WEATHER_KINDS, weatherPrefs } from "../../lib/weather.js";
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

export default function Weather() {
  useAppLocale();
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => weatherPrefs(settings?.weather_prefs));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setMsg(null); };
  const toggle = (key, v) => { setForm((f) => ({ ...f, on: { ...f.on, [key]: v } })); setMsg(null); };
  const word = (key, v) => { setForm((f) => ({ ...f, text: { ...f.text, [key]: v } })); setMsg(null); };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    // WRITTEN WHOLE, AND ONLY THE WORDING THAT WAS ACTUALLY CHANGED. An empty
    // box means *use what you ship*, which has to stay an absent key rather
    // than an empty string — otherwise a detailer who clears a box gets a
    // warning with no words in it.
    const text = {};
    for (const { key, text: shipped } of WEATHER_KINDS) {
      const v = (form.text[key] ?? "").trim();
      if (v && v !== shipped) text[key] = v.slice(0, 120);
    }
    const { error } = await supabase.from("business_settings").update({
      weather_prefs: {
        hotAbove: Number(form.hotAbove),
        coldBelow: Number(form.coldBelow),
        rainChance: Number(form.rainChance),
        windMph: Number(form.windMph),
        on: form.on,
        text,
      },
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("Saved.") });
    if (!error) reload();
    setBusy(false);
  };

  return (
    <>
      <p className="quiet">
        {t("Each booking shows the forecast for its own date and address. These decide when it also gets a warning.")}
      </p>

      <Group title={t("The sky")}>
        <Setting label={t("Thunderstorms")}>
          <Switch bare checked={form.on.storm} onChange={(v) => toggle("storm", v)} label={t("Thunderstorms")} />
        </Setting>
        {/* THE CHANCE FLOOR LIVES ON THE RAIN ROW, not in a group of its own.
            It is the second half of one decision — *warn me about rain, but
            only when it is actually likely* — and a number on another screen
            would be a setting nobody connects to the switch it modifies. */}
        <Setting label={t("Rain")}
          help={form.on.rain ? t("Only when the chance is at least this high.") : undefined}>
          <Switch bare checked={form.on.rain} onChange={(v) => toggle("rain", v)} label={t("Rain")} />
        </Setting>
        {form.on.rain && (
          <Setting label={t("Chance of rain")}>
            <Stepper value={form.rainChance} onChange={(v) => set("rainChance", v)}
              min={10} max={90} suffix="%" />
          </Setting>
        )}
        <Setting label={t("Snow or ice")}>
          <Switch bare checked={form.on.snow} onChange={(v) => toggle("snow", v)} label={t("Snow or ice")} />
        </Setting>
        <Setting label={t("High wind")}>
          <Switch bare checked={form.on.wind} onChange={(v) => toggle("wind", v)} label={t("High wind")} />
        </Setting>
        {form.on.wind && (
          <Setting label={t("Wind speed")}>
            <Stepper value={form.windMph} onChange={(v) => set("windMph", v)}
              min={5} max={60} suffix=" mph" />
          </Setting>
        )}
      </Group>

      <Group title={t("Temperature")}
        blurb={t("Both are in Fahrenheit, and both are about the person doing the work rather than the car.")}>
        <Setting label={t("Warn when it is hotter than")}>
          <Switch bare checked={form.on.hot} onChange={(v) => toggle("hot", v)} label={t("Warn when it is hot")} />
        </Setting>
        {form.on.hot && (
          <Setting label={t("Hot above")}>
            <Stepper value={form.hotAbove} onChange={(v) => set("hotAbove", v)} min={70} max={125} suffix="°" />
          </Setting>
        )}
        <Setting label={t("Warn when it is colder than")}>
          <Switch bare checked={form.on.cold} onChange={(v) => toggle("cold", v)} label={t("Warn when it is cold")} />
        </Setting>
        {form.on.cold && (
          <Setting label={t("Cold below")}>
            <Stepper value={form.coldBelow} onChange={(v) => set("coldBelow", v)} min={0} max={60} suffix="°" />
          </Setting>
        )}
      </Group>

      {/* THE SUMMARY STATES THE CURRENT SETTING IN WORDS, which is `Folded`'s
          own rule — a row that says only "Your own wording" has hidden
          something. */}
      <Folded name={t("Your own wording")}
        now={Object.keys(form.text).length
          ? t("{count} changed", { count: Object.keys(form.text).length })
          : t("The wording we ship")}>
        <p className="quiet">
          {t("Leave a box empty to use ours. {temp} becomes the temperature.")}
        </p>
        {WEATHER_KINDS.map(({ key, label, text }) => (
          <label className="field" key={key}>
            <span>{t(label)}</span>
            <input type="text" maxLength={120} placeholder={t(text)}
              value={form.text[key] ?? ""} onChange={(e) => word(key, e.target.value)} />
          </label>
        ))}
      </Folded>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? t("Saving…") : t("Save weather warnings")}
      </button>
    </>
  );
}
