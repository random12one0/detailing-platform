// THE WEBSITE BRIEF — the screen a detailer fills in so their site can be
// built. Roadmap 9.3.
//
// It wears the first-run form's chrome unchanged — `.setupform`,
// `.settings-head`, `.progress-rule`, `.setupstep`, `.setupfoot`, `.card`,
// `.thoughts`, `.field`, `.chip`. A second stepper is how one product comes to
// look like two. The questions are `lib/siteIntake.js`, not this file.
//
// REBUILT 2026-09-10 to his notes. Five things changed and each is a rule for
// anything added here later:
//
//   · **A question is asked with the right control, not with a radio button.**
//     A colour is a colour picker. Photographs are an upload. Other people's
//     websites are a list of links. *"Rather than a test they have to take."*
//   · **The note box per question is gone**; a multiple-choice question has an
//     **Other** option, which is where the extra answer belongs.
//   · **"Why we ask" is gone.** It was written for us.
//   · **The examples are WALKED** — one per screen, the real page in a frame,
//     with liked/not, what specifically, and a box. Both directions.
//   · **No reassurance in the copy.** No "there is no wrong answer", no
//     telling a detailer what we already know about their own business.
//
// `preview` is the owner looking without being a detailer (2026-09-10): reads
// nothing, writes nothing, needs no session, renders outside BusinessProvider
// — so every context read tolerates there being no provider above it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ExternalLink, X, Check, Plus, Trash2, Mic, Globe } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { addPhoto } from "../lib/photos.js";
import { DISLIKED, EITHER, LIKED, STEPS, answered, intakeProgress } from "../lib/siteIntake.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// A REAL LITTLE PAGE, NOT A DIAGRAM OF ONE.
//
// **This replaced four grey bars, and the four grey bars were his complaint:**
// *"All of these — moves as you scroll, the card fills the screen, words and
// numbers lead — should be better examples rather than just these empty boxes
// and dashes that you can't really tell what it is. They should be more actual
// examples, so we could create our own designs that fit those examples."*
//
// He is right and the reason is simple: **a diagram cannot answer a question
// about how something looks.** Bars have no typeface, no photograph, no price
// and no motion, so "moves as you scroll" was being asked with a picture that
// could not move and "the car fills the screen" with a picture that had no car.
//
// So every option is now a page with real type, a real photograph, a real
// headline and a real price — the same content in all six, because the ONLY
// thing that may differ between two options is the thing being asked about.
// Change the content as well and a detailer is choosing between two businesses
// rather than between two designs.
//
// **`move` genuinely moves and `still` genuinely does not** — the pan and the
// rise are real animations, on an infinite loop, so the difference survives
// somebody just looking at the screen. Both stop under `.lite`, like every
// other animation in this product; the degradation rule is one code path and
// this does not get a second one.
const SAMPLE_PHOTO = "/img/tenant-site-hero.jpg";

function Mini({ kind }) {
  return (
    <div className={`samp samp-${kind}`} aria-hidden="true">
      <div className="samp-bar"><b>PRIME</b><span>Work</span><span>Prices</span></div>
      <div className="samp-hero">
        <img src={SAMPLE_PHOTO} alt="" />
        <h4>Mobile detailing<br />across North Seattle</h4>
      </div>
      <div className="samp-body">
        <div className="samp-row"><span>Full detail</span><b>$235</b></div>
        <div className="samp-row"><span>Express wash</span><b>$65</b></div>
        <div className="samp-row"><span>Ceramic coating</span><b>$1,200</b></div>
      </div>
      <div className="samp-cta">Book</div>
    </div>
  );
}

/* ── talk instead of typing ─────────────────────────────────────────────── */
// **THE CHEAPEST LARGE WIN IN THE FORM, AND IT COSTS NOTHING TO RUN.** Speech
// recognition is built into the browser — no service, no key, no bill — and
// there are twenty-one open boxes here. A detailer standing in a driveway with
// wet hands will talk for a minute and will not type for one.
//
// **IT APPENDS, IT NEVER REPLACES.** A dictation that wiped what somebody had
// already typed would be a worse experience than no dictation, and the failure
// is silent — they look away while talking. Same reason it stops itself: a
// microphone somebody forgot to turn off is a privacy problem, not a bug.
//
// **AND IT HIDES ITSELF WHERE IT DOES NOT WORK** rather than offering a button
// that does nothing. Firefox has no support; every Chrome and Safari does.
const SR = typeof window !== "undefined"
  && (window.SpeechRecognition || window.webkitSpeechRecognition);

function Dictate({ value, onText }) {
  const [on, setOn] = useState(false);
  const rec = useRef(null);
  useEffect(() => () => rec.current?.stop(), []);
  if (!SR) return null;

  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const r = new SR();
    r.lang = document.documentElement.lang || "en-US";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) said += e.results[i][0].transcript;
      }
      if (said.trim()) onText(said.trim());
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };

  return (
    <button type="button" className={`btn sm dictate${on ? " on" : ""}`} onClick={toggle}
      aria-pressed={on} aria-label={on ? t("Stop") : t("Say it instead")}>
      <Mic size={14} strokeWidth={2} /> {on ? t("Listening… tap to stop") : t("Say it instead")}
    </button>
  );
}

/* ── a long answer, with the two things that stop it being an empty box ─── */
// **A BLANK BOX IS WHY THE POLICY QUESTIONS GO UNANSWERED.** The survey of 52
// real detailers' sites found a rain policy on ONE of them and a cancellation
// policy on seven (docs/tenant-site-research-2026-09-10.md § 1c). That is not
// refusal — nobody objects to having a rain policy. It is not knowing how to
// start. **Writing from nothing is a different task from correcting a
// sentence, and only one of them is a task anybody does standing up.**
//
// So a question may carry `starters`: two or three real sentences, taken from
// sites that actually publish one. Tapping puts it in the box to be edited. It
// is deliberately NOT a default value — an unedited starter that nobody read
// is a promise the detailer never made, which is the one thing this form must
// never produce.
function LongAnswer({ q, value, set }) {
  const box = useRef(null);
  return (
    <>
      {q.starters?.length > 0 && !value?.trim() && (
        <div className="starters">
          <span className="label">{t("Start from one of these, then change it")}</span>
          <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
            {q.starters.map((sx) => (
              <button key={sx} type="button" className="chip starter"
                onClick={() => { set(sx); box.current?.focus(); }}>{t(sx)}</button>
            ))}
          </div>
        </div>
      )}
      <textarea ref={box} rows={3} className="intakeinput" aria-label={t(q.question)}
        value={value ?? ""} onChange={(e) => set(e.target.value)} />
      <Dictate value={value} onText={(said) => set(((value ?? "") + " " + said).trim())} />
    </>
  );
}

/* ── point at the page instead of reading a label ───────────────────────── */
// **A CHIP THAT SAYS "FOOTER ONLY" IS A DESCRIPTION OF A PLACE. THIS IS THE
// PLACE.** Same question, same four answers, but the answer is where it will
// actually be rather than a word for where it will be — which is the whole of
// his complaint about the look questions, applied to a positional one.
const SPOTS = [
  ["top", "Top of every page", { left: "6%", top: "7%", width: "88%", height: "13%" }],
  ["hero", "Under the headline", { left: "6%", top: "44%", width: "52%", height: "13%" }],
  ["foot", "Footer only", { left: "6%", top: "80%", width: "88%", height: "13%" }],
];
function PlacePicker({ value, set, options }) {
  const spots = SPOTS.filter(([k]) => options.includes(k));
  return (
    <div className="placepick">
      {/* THE SPOTS LIVE INSIDE THE FRAME, NOT BESIDE IT. They are absolutely
          positioned in percentages, so their containing block has to be the
          drawn page and nothing else — with the wrapper omitted they resolved
          against the whole step and three tap targets landed in the margin,
          over the questions below. Found by looking; no console error, no
          sideways scroll, every percentage correct. */}
      <div className="placeframe">
        <div className="placepage" aria-hidden="true">
          <i className="pp-ph" /><i className="pp-b b1" /><i className="pp-b b2" />
        </div>
        {spots.map(([k, label, box]) => (
          <button key={k} type="button" style={box} aria-pressed={value === k}
            className={`placespot${value === k ? " on" : ""}`}
            onClick={() => set(value === k ? "" : k)}>
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
        <button type="button" className={`chip${value === "none" ? " active" : ""}`}
          aria-pressed={value === "none"} onClick={() => set(value === "none" ? "" : "none")}>
          {t("Not on the site at all")}
        </button>
        <button type="button" className={`chip${value === "other" ? " active" : ""}`}
          aria-pressed={value === "other"} onClick={() => set(value === "other" ? "" : "other")}>
          {t("Other")}
        </button>
      </div>
    </div>
  );
}

/* ── one question ───────────────────────────────────────────────────────── */
// AT MODULE SCOPE, and that is not tidiness: nested inside the screen it is a
// new component type on every render, so React threw the input away and
// rebuilt it on each keystroke and the field lost focus after one letter.
function Question({ q, a, set }) {
  const v = a[q.id];
  const otherKey = `${q.id}::other`;
  const other = a[otherKey];
  const [showOther, setShowOther] = useState(!!other);
  // HIS IDEA, 2026-09-10: *"a button that says, you know, the website answers
  // this question."* It only appears once they have given us their old
  // address on the first screen — offered without one it would be a button
  // pointing at nothing. It counts as answered, because it is an answer: the
  // information exists and we know where to get it.
  const onWeb = a[`${q.id}::web`] === true;

  const chip = (o, on, onClick) => (
    <button key={o} type="button" className={`chip ${on ? "active" : ""}`} aria-pressed={on} onClick={onClick}>
      {t(o)}
    </button>
  );

  return (
    <div className={`card${onWeb ? " onweb" : ""}`}><div className="thoughts">
      <h3 className="qtext">
        {t(q.question)}
        {q.req && <span className="req" title={t("Needed")}>*</span>}
      </h3>

      {a.oldsite?.trim() && (
        <button type="button" className={`chip webchip${onWeb ? " active" : ""}`}
          aria-pressed={onWeb} onClick={() => set(`${q.id}::web`, onWeb ? "" : true)}>
          <Globe size={13} strokeWidth={2} /> {t("It is on my website")}
        </button>
      )}

      {!onWeb && (<>

      {q.type === "text" && (
        <input type="text" className="intakeinput" aria-label={t(q.question)}
          value={v ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}

      {q.type === "long" && (
        <LongAnswer q={q} value={v} set={(x) => set(q.id, x)} />
      )}

      {q.type === "place" && (
        <PlacePicker value={v} set={(x) => set(q.id, x)} options={q.options} />
      )}

      {(q.type === "one" || q.type === "many") && (
        <>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {q.options.map((o) => {
              const on = q.type === "many" ? (v ?? []).includes(o) : v === o;
              return chip(o, on, () => {
                if (q.type === "many") {
                  const s = v ?? [];
                  set(q.id, on ? s.filter((x) => x !== o) : s.concat([o]));
                } else set(q.id, on ? "" : o);
              });
            })}
            {/* A MIDDLE ANSWER ON EVERY TWO-WAY QUESTION — his ask, 2026-09-10:
                *"a lot of them are kind of black and white, I like this or I
                don't like this, but there should be an option for I don't
                really have an opinion."* It is added by the CONTROL rather
                than typed into 73 rows, so a two-option question written next
                year gets it without anybody remembering to.
                **It is a real answer and not a skip.** "I genuinely do not
                mind" is information — it says we may choose — and it is
                different from a question nobody got to. */}
            {q.type === "one" && q.options.length === 2
              && chip("Either is fine", v === "Either is fine", () =>
                set(q.id, v === "Either is fine" ? "" : "Either is fine"))}
            {/* OTHER, WHICH REPLACED THE NOTE BOX ON EVERY QUESTION. His
                words: an option to *"write something else — another option or
                an additional option"*. It is a chip like the rest, so it reads
                as one of the answers rather than as an escape hatch. */}
            {q.other && chip("Other", showOther, () => {
              setShowOther(!showOther);
              if (showOther) set(otherKey, "");
            })}
          </div>
          {q.other && showOther && (
            <input type="text" className="intakeinput" placeholder={t("Type it here")}
              aria-label={t("Other")} value={other ?? ""} onChange={(e) => set(otherKey, e.target.value)} />
          )}
        </>
      )}

      {q.type === "color" && <Colours value={v} set={(x) => set(q.id, x)} />}
      {q.type === "photos" && <Photos value={v} set={(x) => set(q.id, x)} />}

      {/* WHAT THE ANSWER WILL SAY OUT LOUD. Only on questions whose answer
          becomes a PROMISE — a reply time, a guarantee, a cancellation window.
          He was right to worry about clutter, so it appears after the answer
          is picked and on eight questions rather than seventy-three: the point
          is to let somebody see a commitment before they make it, not to
          narrate the form back at them. */}
      {q.says && v && !Array.isArray(v) && (
        <p className="willsay">{t("On your site:")} <b>{t(q.says(v))}</b></p>
      )}
      </>)}
    </div></div>
  );
}

/* ── colors: a picker, a hex box, and as many as they have ──────────────── */
// A COLOUR IS NOT A MULTIPLE-CHOICE QUESTION. His note: *"there should be some
// more interactive elements — a colour picker, a place to upload exact hexes,
// and multiple colours."* Both halves are the same value: the native swatch is
// for somebody who has never seen a hex code, and the text box is for the one
// who has it written on an invoice from the sign shop.
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function Colours({ value, set }) {
  const list = Array.isArray(value) ? value : [];
  const put = (n, hex) => set(list.map((c, i) => (i === n ? hex : c)));
  return (
    <div className="colours">
      {list.map((c, n) => (
        <div className="colourrow" key={n}>
          <input type="color" aria-label={t("Color {n}", { n: n + 1 })}
            value={HEX.test(c) ? (c.startsWith("#") ? c : `#${c}`) : "#000000"}
            onChange={(e) => put(n, e.target.value)} />
          <input type="text" className="intakeinput" aria-label={t("Hex code")}
            placeholder="#1A1A1A" value={c} onChange={(e) => put(n, e.target.value)} />
          <button type="button" className="btn icon ghost" aria-label={t("Remove")}
            onClick={() => set(list.filter((_, i) => i !== n))}>
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => set(list.concat([""]))}>
        <Plus size={14} strokeWidth={2.4} /> {list.length ? t("Another color") : t("Add a color")}
      </button>
    </div>
  );
}

/* ── photos: the question and the upload are one control ────────────────── */
// **THE BIGGEST SINGLE GAP IN THE TRADE IS HERE.** Two thirds of real
// detailers' sites have no before-and-after photographs at all
// (docs/tenant-site-research-2026-09-10.md § 1c) while every guide calls them
// the most important thing on the page — so *"have you got photos?"* answered
// yes and nothing attached is the failure this control exists to prevent. His
// note: *"do you have any photos — yes or no — and then if so, upload them."*
function Photos({ value, set }) {
  const { business } = useBusiness() ?? {};
  const v = value ?? {};
  const files = v.files ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e) => {
    const chosen = Array.from(e.target.files ?? []);
    if (!chosen.length) return;
    setBusy(true); setErr("");
    const done = [...files];
    for (const file of chosen) {
      try {
        // No business means the preview, where there is nothing to attach a
        // photograph to. The name is still recorded so the control behaves.
        if (business?.id) await addPhoto({ file, businessId: business.id, kind: "gallery" });
        done.push(file.name);
      } catch (x) { setErr(x.message); }
    }
    set({ ...v, files: done });
    setBusy(false);
    e.target.value = "";
  };

  return (
    <>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        {["A phone full of them", "A few good ones", "Almost none", "Not mine"].map((o) => (
          <button key={o} type="button" className={`chip ${v.have === o ? "active" : ""}`}
            aria-pressed={v.have === o} onClick={() => set({ ...v, have: v.have === o ? "" : o })}>
            {t(o)}
          </button>
        ))}
      </div>
      {v.have && v.have !== "Almost none" && (
        <div className="uploadbox">
          <label className="btn sm">
            {busy ? t("Uploading…") : t("Choose photos")}
            <input type="file" accept="image/*" multiple hidden onChange={pick} disabled={busy} />
          </label>
          {files.length > 0 && (
            <span className="label">{t("{n} added", { n: files.length })}</span>
          )}
          {!business?.id && <span className="label">{t("Sign in to upload for real")}</span>}
          {err && <span className="label">{err}</span>}
        </div>
      )}
    </>
  );
}

/* ── one of our sites, with the real page in it ─────────────────────────── */
// **THE FRAME IS THE POINT.** He asked for *"a little preview of what the site
// looks like"* and for them to go through every one. The pages are real routes
// on this same origin (`scripts/build-examples.mjs`), so this is the site
// itself scaled down rather than a picture of it that goes stale — the same
// reason that script copies at build time instead of committing a duplicate.
// `Mini` sits underneath until it loads, so the card is never an empty box.
const FRAME_W = 1280, FRAME_H = 900;
function LookStep({ site, value, set }) {
  const v = value ?? {};
  const chips = v.chips ?? [];
  const [loaded, setLoaded] = useState(false);
  const words = v.verdict === "no" ? DISLIKED : LIKED;

  // THE SCALE IS MEASURED, NOT GUESSED. The frame renders at a desktop 1280
  // and is transformed down, so what a detailer sees is the desk layout rather
  // than a phone layout pretending to be one. A fixed scale factor left a
  // 150px strip of dead card beside it at 1440 and cropped it at 320, because
  // the column this sits in is a different width at every breakpoint — so the
  // factor comes from the box itself.
  const box = useRef(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / FRAME_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggle = (w) => set({ ...v, chips: chips.includes(w) ? chips.filter((x) => x !== w) : chips.concat([w]) });

  return (
    <>
      {/* WHAT TO DO WITH IT, BECAUSE "here is a website, do you like it" is
          not a task. His note: *"it should be like, here's an example website
          we made, look through it, analyse things you like about it and don't
          like, and then report below."* A detailer handed a page with two
          buttons under it answers in two seconds and tells us nothing; one
          who is told to go and look at it comes back with something. */}
      <p className="quiet">
        {t("A site we built. Open it, scroll it, click around. Then say what you liked and what you did not.")}
      </p>
      <p className="quiet">{t(site.note)}</p>

      <div className="sitecard" ref={box}
        style={{ height: scale ? `${Math.round(FRAME_H * scale)}px` : "260px" }}>
        {!loaded && <Mini kind={site.kind} />}
        {scale > 0 && (
          <iframe className="siteframe" src={site.href} title={site.name} loading="lazy"
            tabIndex={-1} onLoad={() => setLoaded(true)}
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }} />
        )}
        <a className="btn sm" href={site.href} target="_blank" rel="noreferrer">
          {t("Open it")} <ExternalLink size={13} strokeWidth={2} />
        </a>
      </div>

      <div className="card"><div className="thoughts">
        <div className="row wrap" style={{ gap: 6 }}>
          <button type="button" className={`chip ${v.verdict === "yes" ? "active" : ""}`}
            aria-pressed={v.verdict === "yes"}
            onClick={() => set({ ...v, verdict: v.verdict === "yes" ? "" : "yes", chips: [] })}>
            <Check size={13} strokeWidth={2.4} /> {t("I like it")}
          </button>
          <button type="button" className={`chip ${v.verdict === "no" ? "active" : ""}`}
            aria-pressed={v.verdict === "no"}
            onClick={() => set({ ...v, verdict: v.verdict === "no" ? "" : "no", chips: [] })}>
            {t("Not for me")}
          </button>
          {/* **REQUIRED AND NO OPINION ARE NOT A CONTRADICTION**, which is the
              thing he spotted: *"some people might not have a preference, so
              their website's kind of in the middle."* Forcing a like or a
              dislike out of somebody who has neither produces a false answer,
              and a false answer is worse than a blank because we act on it.
              So this satisfies the requirement — they looked, and they told us
              they do not mind. */}
          <button type="button" className={`chip ${v.verdict === "meh" ? "active" : ""}`}
            aria-pressed={v.verdict === "meh"}
            onClick={() => set({ ...v, verdict: v.verdict === "meh" ? "" : "meh", chips: [] })}>
            {t("No strong feeling")}
          </button>
        </div>

        {/* THE WORDS ONLY APPEAR ONCE THEY HAVE PICKED A SIDE, and they are a
            DIFFERENT SET each way. A single list of adjectives cannot say
            whether "dark" was the reason they liked it or the reason they
            did not, and his ask was explicitly for both directions. */}
        {v.verdict && v.verdict !== "meh" && (
          <>
            <span className="label">{v.verdict === "yes" ? t("What did you like?") : t("What put you off?")}</span>
            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              {words.map((w) => (
                <button key={w} type="button" className={`chip ${chips.includes(w) ? "active" : ""}`}
                  aria-pressed={chips.includes(w)} onClick={() => toggle(w)}>{t(w)}</button>
              ))}
            </div>
            <textarea rows={2} className="intakeinput"
              placeholder={v.verdict === "yes"
                ? t("Anything specific — a feature, a section, the way something works")
                : t("Anything specific")}
              aria-label={t("Your thoughts")}
              value={v.note ?? ""} onChange={(e) => set({ ...v, note: e.target.value })} />
          </>
        )}
      </div></div>
    </>
  );
}

/* ── other people's sites ───────────────────────────────────────────────── */
// His ask: a place to say *"I like this car detailing website, and here's
// why"* — **and the other half, which he was explicit about:** *"we also need
// stuff saying here's negatives that I don't like and why."* One list, each
// row carrying which way it goes, because a site somebody hates is worth as
// much as one they love and a separate list for each would get half filled in.
function SitesStep({ value, set }) {
  const rows = Array.isArray(value) ? value : [];
  const put = (n, patch) => set(rows.map((r, i) => (i === n ? { ...r, ...patch } : r)));
  return (
    <>
      {/* A RULED LIST, NOT A STACK OF CARDS. `composition` test 1 forbids
          mapping records onto `.card` and it is right here: these are rows
          somebody adds four of, and four cards is four boxes of chrome around
          three fields each. */}
      {rows.map((r, n) => (
        <div className="siterow" key={n}>
          <div className="colourrow">
            <input type="url" className="intakeinput" placeholder="https://…" aria-label={t("Web address")}
              value={r.url ?? ""} onChange={(e) => put(n, { url: e.target.value })} />
            <button type="button" className="btn icon ghost" aria-label={t("Remove")}
              onClick={() => set(rows.filter((_, i) => i !== n))}>
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <button type="button" className={`chip ${r.verdict === "yes" ? "active" : ""}`}
              aria-pressed={r.verdict === "yes"} onClick={() => put(n, { verdict: "yes" })}>{t("I like it")}</button>
            <button type="button" className={`chip ${r.verdict === "no" ? "active" : ""}`}
              aria-pressed={r.verdict === "no"} onClick={() => put(n, { verdict: "no" })}>{t("I don't")}</button>
          </div>
          <textarea rows={2} className="intakeinput" aria-label={t("Why")}
            placeholder={r.verdict === "no" ? t("What's wrong with it?") : t("What do you like about it?")}
            value={r.why ?? ""} onChange={(e) => put(n, { why: e.target.value })} />
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => set(rows.concat([{ url: "", verdict: "", why: "" }]))}>
        <Plus size={14} strokeWidth={2.4} /> {rows.length ? t("Another one") : t("Add a website")}
      </button>
    </>
  );
}

/* ── the screen ─────────────────────────────────────────────────────────── */
export default function SiteIntake({ onClose, preview = false }) {
  useAppLocale();
  const { business, role } = useBusiness() ?? {};
  const [row, setRow] = useState(preview ? null : undefined);   // undefined = loading
  const [a, setA] = useState({});
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const heading = useRef(null);
  const timer = useRef(null);
  const owner = role === "owner";

  useEffect(() => {
    if (preview || !business?.id) return;
    let live = true;
    supabase.from("site_intake").select("*").eq("business_id", business.id).maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        setRow(data ?? null);
        setA(data?.answers ?? {});
        setI(Math.min(data?.step ?? 0, STEPS.length - 1));
      });
    return () => { live = false; };
  }, [business?.id, preview]);

  // ONE WRITER, DEBOUNCED. Every editor on every step goes through `set`, so
  // there is one upsert in this file rather than one per question.
  const push = useCallback(async (answers, step, extra) => {
    if (preview || !business?.id || !owner) return;
    const { error } = await supabase.from("site_intake")
      .upsert({ business_id: business.id, answers, step, updated_at: new Date().toISOString(), ...extra },
        { onConflict: "business_id" });
    setErr(error ? error.message : "");
  }, [business?.id, owner, preview]);

  const set = (id, value) => {
    setA((prev) => {
      const next = { ...prev, [id]: value };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => push(next, i), 900);
      return next;
    });
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = async (n) => {
    clearTimeout(timer.current);
    setDir(n > i ? 1 : -1);
    const at = Math.max(0, Math.min(n, STEPS.length - 1));
    setI(at);
    window.scrollTo(0, 0);
    await push(a, at);
  };

  const finish = async () => {
    setBusy(true);
    clearTimeout(timer.current);
    await push(a, i, { submitted_at: new Date().toISOString() });
    setBusy(false);
    setRow((r) => ({ ...(r ?? {}), submitted_at: new Date().toISOString() }));
  };

  const p = useMemo(() => intakeProgress(a), [a]);
  useEffect(() => { heading.current?.focus(); }, [i]);

  if (row === undefined) return <div className="group" />;

  if (row?.submitted_at && i === STEPS.length - 1) {
    return (
      <div className="group setupform intake">
        <div className="settings-head">
          <span />
          <h1 className="display">{t("Your website")}</h1>
          <button className="x" aria-label={t("Close")} onClick={onClose}><X size={18} strokeWidth={2} /></button>
        </div>
        <div className="setupstep">
          <h2 className="title">{t("Got it.")}</h2>
          <p className="quiet">{t("{done} of {total} answered. Come back any time to change something.",
            { done: p.done, total: p.total })}</p>
          <div className="setupfoot">
            <button className="btn" onClick={() => go(0)}>{t("Go back through it")}</button>
            <button className="btn primary" onClick={onClose}>{t("Done")}</button>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // WHAT THIS STEP STILL NEEDS BEFORE IT WILL LET GO.
  //
  // **Required is new and it is his call, 2026-09-10** — his example was the
  // colours: *"I think that should be required to at least have one colour
  // that they choose."* The test I applied to the rest: **could we build the
  // site without it, or would we be guessing at something the detailer would
  // recognise as wrong the moment they saw it?** Nine questions pass, plus a
  // verdict on each of the five example sites, which he asked for by name:
  // *"have that be required for every single website."*
  //
  // **A required question can still be answered "it is on my website"** — that
  // is an answer, not a dodge: the information exists and we know where it is.
  //
  // The other 64 stay optional. A form that demands all 73 gets none of them.
  const need = (() => {
    if (step.kind === "look") {
      return (a[`look${step.site.n}`] ?? {}).verdict ? [] : [t("Say whether you like it.")];
    }
    if (step.kind === "sites") {
      return (a.others ?? []).some((r) => r.url?.trim()) ? [] : [t("Add at least one website.")];
    }
    return (step.qs ?? [])
      .filter((x) => x.req && a[`${x.id}::web`] !== true && !answered(a[x.id]))
      .map((x) => t(x.question));
  })();
  const blocked = need.length > 0;

  return (
    <div className="group setupform intake">
      {preview && (
        <div className="impbar" role="status">
          <span>{t("Preview. This is the form a detailer fills in — nothing here is saved.")}</span>
        </div>
      )}
      <div className="settings-head">
        <button className="btn icon ghost" aria-label={t("Back")} disabled={i === 0} onClick={() => go(i - 1)}>
          <ChevronLeft strokeWidth={2} />
        </button>
        <h1 className="display">{t("Your website")}</h1>
        <button className="x" aria-label={t("Close")} onClick={onClose}><X size={18} strokeWidth={2} /></button>
      </div>

      <div className="tight">
        <div className="progress-rule" aria-hidden="true">
          {STEPS.map((s, n) => <span key={s.key} className={n < i ? "on" : ""} />)}
        </div>
        <span className="label">{t("Step {n} of {total} · {name}",
          { n: i + 1, total: STEPS.length, name: t(step.name) })}</span>
      </div>

      <div className={`setupstep ${dir > 0 ? "fwd" : "back"}`} key={step.key}>
        <h2 className="title" ref={heading} tabIndex={-1}>{t(step.title)}</h2>
        {step.lede && <p className="quiet">{t(step.lede)}</p>}

        {step.kind === "hello" && (
          <>
            <div className="card"><div className="thoughts">
              <ul className="plainlist">
                <li>{t("About fifteen minutes.")}</li>
                <li>{t("It saves as you go. Close it whenever you like and come back to the same place.")}</li>
                {/* HE ASKED FOR THIS AND REFUSED THE OBVIOUS VERSION OF IT.
                    *"I don't wanna have an option to say save later, but I
                    think they should know that the website will not be made
                    until they completely fill out the form."* So there is no
                    Save-and-exit button — closing already saves — and the
                    consequence is stated once, at the top, where somebody
                    deciding whether to start can read it. */}
                <li>{t("We start building once it is finished.")}</li>
              </ul>
            </div></div>
            {/* HIS IDEA, 2026-09-10, AND IT IS BETTER THAN THE ONE IT
                REPLACED. The proposal on the table was to READ their old site
                and pre-fill from it; he refused the machinery — *"I don't
                wanna have to connect an AI and have it whatever"* — and asked
                for this instead: take the address, and tell them that anything
                already on it can be skipped.
                **It gets most of the value for none of the cost, and it is
                honest.** A person building the site reads the old one; the
                form never claims to have read anything. */}
            <div className="card"><div className="thoughts">
              <h3 className="qtext">{t("Got a website already?")}</h3>
              <input type="url" className="intakeinput" placeholder="https://…"
                aria-label={t("Your current website")}
                value={a.oldsite ?? ""} onChange={(e) => set("oldsite", e.target.value)} />
              {a.oldsite?.trim() && (
                <p className="quiet">{t("Then skip any question it already answers. We will take that from your site.")}</p>
              )}
            </div></div>
          </>
        )}

        {step.kind === "look" && (
          <LookStep site={step.site} value={a[`look${step.site.n}`]}
            set={(x) => set(`look${step.site.n}`, x)} />
        )}

        {step.kind === "sites" && <SitesStep value={a.others} set={(x) => set("others", x)} />}

        {step.kind === "either" && EITHER.map(([id, question, left, right]) => (
          <div className="card" key={id}><div className="thoughts">
            <h3 className="qtext">{t(question)}</h3>
            <div className="pairgrid">
              {[left, right].map(([k, label]) => (
                <button key={k} type="button" className={`paircard ${a[id] === k ? "on" : ""}`}
                  aria-pressed={a[id] === k} onClick={() => set(id, k)}>
                  <Mini kind={k} />
                  <span>{t(label)}</span>
                </button>
              ))}
            </div>
            <button type="button" className={`chip nopref${a[id] === "either" ? " active" : ""}`}
              aria-pressed={a[id] === "either"}
              onClick={() => set(id, a[id] === "either" ? "" : "either")}>
              {t("No preference")}
            </button>
          </div></div>
        ))}

        {(step.qs ?? []).map((q) => <Question key={q.id} q={q} a={a} set={set} />)}

        {!owner && !preview && (
          <p className="quiet">{t("Only the owner can answer this, so nothing here will save.")}</p>
        )}
        {err && <div className="error-box">{err}</div>}
      </div>

      {/* A DEAD BUTTON WITH NO REASON IS A BUG, even when it is meant to be
          dead. Continue waits, and this says exactly what it is waiting for. */}
      {blocked && (
        <p className="needline">
          {step.kind === "look" || step.kind === "sites"
            ? need[0]
            : t("{n} still needed on this page.", { n: need.length })}
        </p>
      )}

      {last && !row?.submitted_at && (
        <p className="quiet" style={{ textAlign: "center" }}>
          {t("Nothing gets built until you send this. You can still change anything afterwards.")}
        </p>
      )}

      <div className="setupfoot">
        {/* SKIP DISAPPEARS ON A STEP THAT REQUIRES SOMETHING, or "required"
            means nothing. The close button is always there, so nobody is
            trapped in the form — only in the step. */}
        {!blocked && (
          <button className="btn" disabled={busy} onClick={() => (last ? onClose() : go(i + 1))}>
            {last ? t("Finish later") : t("Skip")}
          </button>
        )}
        <button className="btn primary" disabled={busy || blocked}
          onClick={() => (last ? finish() : go(i + 1))}>
          {busy ? t("Saving…") : last ? t("Send it") : t("Continue")}
        </button>
      </div>

      {!preview && (
        <button className="btn sm inline ghost setupquit" disabled={busy}
          onClick={async () => { await push(a, i, { dismissed: true }); onClose(); }}>
          {t("I do not want a website")}
        </button>
      )}

      <span className="label intakecount">
        {preview
          ? t("{done} of {total} answered · nothing is saved in a preview", { done: p.done, total: p.total })
          : t("{done} of {total} answered · saved automatically", { done: p.done, total: p.total })}
      </span>
    </div>
  );
}
