// ROADMAP 8.17 — the way out of a translation nobody here can check.
//
// **IT IS ON THE PAGE RATHER THAN IN A MENU, AND ENGLISH IS NEVER TAKEN
// AWAY.** The owner's own limit is *"I can't check that sadly, because I don't
// speak Spanish"*, so some of the Spanish will be wrong and there is nobody to
// catch it before a customer does. A visible switch turns that from a wall
// into an annoyance: somebody who cannot make sense of a line presses two
// letters and carries on booking.
//
// **IT ONLY EXISTS WHERE THERE IS SOMETHING TO SWITCH TO.** With one language
// installed it renders nothing at all — a control offering one choice is a
// control that teaches people to ignore controls.
//
// **AND IT DOES NOT RELOAD THE PAGE.** `setLocale` notifies subscribers and
// React repaints; a reload is shorter to write and would throw away a
// half-filled booking form, which is the one thing this page exists not to do.
import { getLocale, LOCALE_NAMES, LOCALES, setLocale, t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";

export default function LanguagePicker() {
  const active = useLocale();
  if (LOCALES.length < 2) return null;
  return (
    <div className="bk-lang" role="group" aria-label={t("Language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`bk-chip word ${active === code ? "selected" : ""}`}
          aria-pressed={active === code}
          // **`lang` ON THE BUTTON, so a screen reader pronounces "Español"
          // in Spanish rather than reading it as English.** The names are
          // deliberately never translated: somebody looking for their own
          // language looks for the word they know.
          lang={code}
          // **THE CODE IS DRAWN AND THE NAME IS THE LABEL, AND THAT IS A
          // MEASUREMENT RATHER THAN A PREFERENCE.** The first version drew
          // "English" and "Español"; at 392 the masthead wrapped them onto a
          // line of their own and every step lost about 40px — which broke
          // W16 on EIGHT of them, including two that had been fitting with
          // nine pixels to spare. Every step's spare room is the DETAILER's
          // budget (CLAUDE.md), so a control of ours may not spend it.
          // `EN` / `ES` is two 40px chips that sit beside the business name at
          // 320, costs no height at all, and is the most recognised language
          // switch on the web. The full name is still there for anybody who
          // needs it — as the accessible name and the tooltip.
          title={LOCALE_NAMES[code]}
          aria-label={LOCALE_NAMES[code]}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export { getLocale };
