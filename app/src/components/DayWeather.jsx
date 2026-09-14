// WILL IT RAIN ON THE JOBS I HAVE BOOKED — one line, on Today, under the date.
//
// ---------------------------------------------------------------------------
// WHERE IT EARNS ITS PLACE, WHICH WAS THE QUESTION — 2026-09-13.
// ---------------------------------------------------------------------------
// The server side has existed since this morning (`supabase/functions/forecast`
// and `_shared/weather.ts`) and there was no screen at all; Andrew went looking
// for it and found nothing.
//
// **IT IS NOT A PAGE.** A weather page is a page a detailer would open once and
// never again, and it would be a worse version of the app already on their
// phone. The only thing this product can tell them that a weather app cannot is
// *what the sky is doing over the work you have booked*, and that sentence only
// exists where the day's work is — which is Today, the screen they open in a
// driveway between jobs. So it is one line, directly under the date, above the
// money and the rail.
//
// **AND IT IS ONLY WORTH ANYTHING TO SOMEBODY WORKING OUTDOORS**, which is what
// the rail underneath it is a list of. A detailer in a unit reads it once,
// learns it says nothing they need, and never looks at it again — it costs them
// 20px and no taps.
//
// ---------------------------------------------------------------------------
// IT NEVER BLOCKS AND NEVER SLOWS ANYTHING. That was his condition when he
// first agreed to weather at all, and it is enforced here rather than promised:
// ---------------------------------------------------------------------------
//   · Nothing on this screen waits for it. It renders null until it has an
//     answer, and the rest of Today has already painted.
//   · **IT DOES NOT ASK FOR YOUR LOCATION UNPROMPTED.** A permission dialog
//     that appears on its own, over the screen somebody opened to see their
//     first job, is exactly the interruption he refused. The Permissions API is
//     asked FIRST, silently: already granted and it just draws; not yet and it
//     offers a button; refused and it renders nothing, for ever, with no
//     nagging.
//   · **EVERY FAILURE IS SILENCE.** A dropped connection, a 503, a browser with
//     no geolocation — all render nothing. This is a courtesy line about the
//     weather; an error box about it would be louder than the thing itself.
//   · `outside_coverage` is REMEMBERED, because it is the one failure that will
//     never stop being true. The NWS covers the United States; a detailer
//     anywhere else gets asked once in their life rather than once a morning.
//
// **NOTHING HERE WRITES A ROW, HOLDS A SLOT OR MESSAGES ANYBODY**, and a later
// change that does needs asking him first — his refusal of 2026-09-06 was
// specifically *"I don't think there should be auto-blocking if it's rain."*

import { useEffect, useState } from "react";
import { CloudSun } from "lucide-react";
import { api } from "../lib/api.js";
import { t } from "../lib/appI18n.js";

// The one thing worth remembering between sessions, and it is a fact about the
// PLACE rather than about the weather: we are outside the only country this
// service covers.
const OUT_KEY = "dp.weather.outside";

export default function DayWeather({ businessId }) {
  // null = nothing to draw. "ask" = offer the button. An object = a forecast.
  const [state, setState] = useState(null);

  const load = () => {
    if (!navigator.geolocation) { setState(null); return; }
    navigator.geolocation.getCurrentPosition(
      // **`maximumAge` IS WHY THERE IS NO CACHE IN THIS FILE.** The browser
      // already holds the last fix and will hand it back for ten minutes
      // without waking the GPS, which is the whole of what a cache of our own
      // would have bought. `timeout` matters more than accuracy here: a line
      // about the sky is not worth a spinner, and a fix that takes eight
      // seconds has already missed the moment it was useful.
      async ({ coords }) => {
        try {
          const r = await api.forecast(businessId, coords.latitude, coords.longitude);
          if (r?.ok && r.periods?.length) { setState({ now: r.periods[0] }); return; }
          if (r?.reason === "outside_coverage") {
            try { localStorage.setItem(OUT_KEY, "1"); } catch { /* private mode */ }
          }
          setState(null);
        } catch { setState(null); }
      },
      () => setState(null),
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  useEffect(() => {
    let live = true;
    try { if (localStorage.getItem(OUT_KEY)) return; } catch { /* private mode */ }

    // **ASKED BEFORE ANYTHING HAPPENS, AND IT IS THE WHOLE OF THE NO-INTERRUPT
    // PROMISE.** `navigator.permissions` is not in every browser — older Safari
    // has no geolocation entry for it — and there the honest answer is to offer
    // the button rather than to guess that a prompt is safe.
    if (!navigator.permissions?.query) { setState("ask"); return; }
    navigator.permissions.query({ name: "geolocation" })
      .then((p) => {
        if (!live) return;
        if (p.state === "granted") load();
        else if (p.state === "prompt") setState("ask");
        // "denied" falls through to null: they have already said no.
      })
      .catch(() => live && setState("ask"));
    return () => { live = false; };
  }, [businessId]);

  if (!state) return null;

  if (state === "ask") {
    return (
      <p className="weather-line">
        {/* ONE QUIET INLINE CONTROL, AND THE FIRST VERSION OF THIS WAS THE
            OPPOSITE — measured at 392 and thrown away. A `.btn.sm` in a flex
            column goes FULL WIDTH: the offer was an 84px block with a
            shoulder-to-shoulder button and an explanatory sentence under it,
            directly beneath the date, which made a courtesy the loudest thing
            on the screen a detailer opens between jobs. `ghost inline` keeps
            the 38px control and the 44px target and takes only its own words.

            **AND THE SENTENCE UNDER IT IS GONE RATHER THAN REWORDED.** It said
            the press asks for your location — which the browser's own dialog
            says a quarter of a second later, in the operating system's words,
            with the buttons that decide it. Nothing here stores a coordinate;
            the point goes to the forecast and is never written down. */}
        <button type="button" className="btn sm ghost inline" onClick={() => { setState(null); load(); }}>
          <CloudSun size={16} strokeWidth={2} aria-hidden="true" />
          {t("Show today’s weather")}
        </button>
      </p>
    );
  }

  const p = state.now;
  return (
    <p className="weather-line" data-weather>
      <CloudSun size={16} strokeWidth={2} aria-hidden="true" />
      {/* THEIR WORDS FOR THE SKY, NOT OURS. `shortForecast` is the NWS's own
          phrase ("Patchy Fog then Partly Sunny") and `name` is their word for
          the part of the day. Neither goes through `t()`: they arrive in
          English from a US government service and rewriting them into a
          catalogue would be inventing a forecast. The temperature and the
          chance of rain are numbers, and the words around them are ours. */}
      <span>{p.name} · {p.temperature}° · {p.shortForecast}</span>
      {p.precipChance != null && p.precipChance > 0 && (
        <span className="quiet">{t("{pct}% rain", { pct: p.precipChance })}</span>
      )}
    </p>
  );
}
