// FIRST RUN, HALF ONE: the setup form. Roadmap 2.11 step 6, stage 7.
//
// The owner overruled the recommendation to build this as empty states
// (DECISIONS.md → "Roadmap 2.11, steps 3-5", Q1). He asked for a form AND,
// SEPARATELY, a guided tour — *"they could, like, skip stuff or enter it
// later"* — and screen designs §13 keeps them two on purpose. This file is
// the form; `Walkthrough.jsx` is the tour.
//
// ═══════════════════════════════════════════════════════════════════════════
// REBUILT 2026-09-10: IT WALKS THE REAL SETTINGS SCREENS NOW
// ═══════════════════════════════════════════════════════════════════════════
//
// His instruction, said three times in one message: *"everything in the admin
// dashboard should be completely filled out just from that initial first-run
// setup."* And then how to build it: *"you could just completely reuse
// basically every single GUI that's already in the admin dashboard, but have
// it as a form layout where you settle a stuff, then press continue, going to
// every single page."*
//
// **THE SEVEN BESPOKE EDITORS THIS FILE USED TO CARRY ARE GONE.** They were
// small copies of screens that already existed, and the copies drifted — setup
// asked for ONE open and close time for the whole week while the real Hours
// screen has always done days properly. That was his complaint (*"there should
// be an open and close time for every single day — is that not obvious?"*) and
// it is what a second copy of an editor guarantees, eventually, every time.
//
// **SO A STEP IS NOW A SETTINGS SCREEN, RENDERED WHOLE.** `lib/setup.js`'s
// fourth column is a key into `screens/more/index.js`. Those screens already
// render as a bare `.group` or `.card` with no header of their own — which is
// why `Appearance` could be dropped in here as far back as the first version —
// so they need no adaptation. **One editor per thing in this product, and
// setup cannot fall behind the dashboard again.**
//
// **EACH SCREEN SAVES ITSELF.** That is why there is no `commit()` here any
// more: the screens have their own Save buttons and their own writes, and
// Continue does one thing, which is to mark the step done and move on. A
// second write path over the top of theirs is how two editors disagree.
//
// **WHAT THE SHAPE STILL OWES §13a AND THE PHONE PASS §14:** one question a
// step, one column at every width, skippable, resumable, and an order that
// leaves a detailer who quits after two steps with a bookable page.
//
// STAFF NEVER SEE THIS (§13b) — they are not setting up a business, and the
// database refuses them most of these writes anyway. App.jsx gates it.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { STEPS } from "../lib/setup.js";
import { SCREENS } from "../screens/more/index.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function SetupForm({ onClose }) {
  useAppLocale();
  const { business, settings, reload: reloadTenant } = useBusiness();
  const [i, setI] = useState(0);
  // Which way the last move went, so the step that arrives comes from the
  // side it was travelling from rather than always from the right.
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const heading = useRef(null);

  const patchSetup = async (patch) => {
    const now = settings?.setup ?? {};
    await supabase.from("business_settings")
      .upsert({ business_id: business.id, setup: { ...now, ...patch } }, { onConflict: "business_id" });
    await reloadTenant();
  };

  // OPENING IT IS WHAT MARKS IT SEEN, and it has to be written here rather
  // than by whatever opened it, because both doors lead to this component.
  //
  // ON CLOSE, NOT ON MOUNT — roadmap 7.3's final pass, finding 2. Marking it
  // on mount meant the form was "seen" the instant it appeared, so tapping a
  // rail button in the first ten seconds dismissed it, marked it done with,
  // and took the tour that follows it away for ever — silently.
  const marked = useRef(false);

  // **CONTINUE MARKS, IT DOES NOT SAVE**, because the screen underneath has
  // already saved with its own button. What it must not do is mark a step
  // nobody touched: testing loop F-002 found `go(i + 1, true)` appending the
  // key whatever was on screen, so tapping the primary button seven times —
  // the obvious thing to do — reported **7 of 7 done** on a business that had
  // answered one question. That number is printed on Business and in the back
  // office, so it told the owner a detailer was set up when they were not.
  //
  // The old guard asked "did they type into my editor". There is no editor
  // here to ask, so the guard is the BUTTON: Continue means *I have done this
  // one* and Skip means *not now*. Two buttons, two meanings, and the detailer
  // is the one who knows which is true.
  const go = async (n, mark) => {
    if (busy) return;
    setBusy(true);
    try {
      if (mark) {
        const key = STEPS[i][0];
        const done = [...new Set([...(settings?.setup?.done ?? []), key])];
        await patchSetup({ done });
      }
      if (n >= STEPS.length) { close(); return; }
      setDir(n > i ? 1 : -1);
      setI(Math.max(0, n));
      window.scrollTo(0, 0);
    } finally { setBusy(false); }
  };

  // ENTRANCE AND EXIT IN THE SAME CHANGE — CLAUDE.md's standing rule since
  // 2026-09-02. `Sheet.jsx` has used this leaving-then-unmount pattern since
  // it was written, and reusing it is one less mechanic in the product.
  const close = useCallback(() => {
    if (!marked.current) { marked.current = true; patchSetup({ seen: true }); }
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);   // --t-exit
  }, [onClose]);

  // A new question is a new heading, and a screen reader has no other way to
  // know the step changed — the surrounding chrome does not move.
  useEffect(() => { heading.current?.focus(); }, [i]);

  const [key, question, name, screen] = STEPS[i];
  const done = new Set(settings?.setup?.done ?? []);
  const Screen = SCREENS[screen]?.[0];
  const last = i === STEPS.length - 1;

  return (
    <div className={`group setupform${leaving ? " leaving" : ""}`}>
      <div className="settings-head">
        <button className="btn icon ghost" aria-label={t("Back")} disabled={i === 0}
          onClick={() => go(i - 1, false)}>
          <ChevronLeft strokeWidth={2} />
        </button>
        {/* SHORT ON PURPOSE, and it was measured: "Set up your booking page"
            wrapped to two lines at 392 beside a back control and a close. The
            step underneath says what is being set up. */}
        <h1 className="display">{t("Getting started")}</h1>
        <button className="x" aria-label={t("Close setup")} onClick={close}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* THE PROGRESS RULE (component inventory §1b). One segment a step,
          filled by what is FINISHED rather than by where you are — so a
          skipped step leaves a hole, and the hole is the instruction to come
          back. Where you are is said in words underneath, which is also the
          accessible form of it: the segments are decoration and say so. */}
      <div className="tight">
        <div className="progress-rule" aria-hidden="true">
          {STEPS.map(([k]) => <span key={k} className={done.has(k) ? "on" : ""} />)}
        </div>
        <span className="label">{t("Step {n} of {total} · {name}",
          { n: i + 1, total: STEPS.length, name: t(name) })}</span>
      </div>

      <div className={`setupstep ${dir > 0 ? "fwd" : "back"}`} key={key}>
        <h2 className="title" ref={heading} tabIndex={-1}>{t(question)}</h2>
        {/* A MISSING SCREEN IS A TYPO IN `lib/setup.js`, and it must not be a
            blank step that reads as a broken product. */}
        {Screen ? <Screen /> : <p className="quiet">{t("This part is not ready yet.")}</p>}
      </div>

      <div className="setupfoot">
        {/* SKIPPING NEVER BLOCKS THE NEXT STEP — §13a, in the owner's own
            words. It also never marks the step done, which is what leaves the
            hole in the rule above. */}
        <button className="btn" disabled={busy} onClick={() => go(i + 1, false)}>
          {t("I'll do this later")}
        </button>
        <button className="btn primary" disabled={busy} onClick={() => go(i + 1, true)}>
          {busy ? t("Saving…") : last ? t("Finish") : t("Continue")}
        </button>
      </div>

      {/* The one way to stop being asked. It is here rather than on Business's
          row because the row is a nav-row — a control inside it would be a
          button inside a button — and because the decision belongs where the
          thing being dismissed is, not on the screen it nags from. */}
      <button className="btn sm inline ghost setupquit"
        onClick={async () => { await patchSetup({ dismissed: true }); close(); }}>
        {t("Don't remind me again")}
      </button>
    </div>
  );
}
