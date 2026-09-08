// ROADMAP 8.17 STAGE 2B — THE DASHBOARD'S LANGUAGE SWITCH.
//
// The twin of `book/LanguagePicker.jsx`, against the other scope. Same two
// letters, same reasoning, one deliberate difference in WHERE it lives.
//
// ---------------------------------------------------------------------------
// IT IS ON THE GEAR'S FIRST SCREEN, NOT BEHIND A SETTINGS ROW
// ---------------------------------------------------------------------------
// *This device* would be the tidy home for it — `dp.lang.app` is a per-device
// choice, exactly like the maps and calendar preferences on that screen. It is
// the wrong home, and the reason is the whole point of the feature:
//
// **SOMEBODY WHO NEEDS THIS CANNOT READ THE MENU THAT LEADS TO IT.** A
// detailer whose English runs out has to get through a gear, a row called
// *This device* and a heading called *Language* to reach the one control that
// would have helped. Two letters on the first screen they open need no reading
// at all — `EN` and `ES` are the same two letters in both languages, which is
// why every product on the web spells the switch this way.
//
// ---------------------------------------------------------------------------
// AND IT SHIPPED WITH THE LAST SCREEN, NEVER BEFORE IT
// ---------------------------------------------------------------------------
// Stage 1b's rule: *a control must not promise a language the surface cannot
// speak.* Every commit of stage 2b before this one wrapped strings with no way
// to reach the second language, which is why each of them was a no-op in
// English and safe to ship on its own. This is the change that makes the
// switch real, and it is deliberately last.
//
// **ENGLISH IS NEVER TAKEN AWAY.** The owner cannot read the Spanish — *"I
// can't check that sadly, because I don't speak Spanish"* — so some of it will
// be wrong with nobody to catch it. A visible switch turns that from a wall
// into an annoyance: somebody who cannot make sense of a line presses two
// letters and carries on working.
import { LOCALE_NAMES, LOCALES, setAppLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function AppLanguagePicker() {
  const active = useAppLocale();
  // A control offering one choice teaches people to ignore controls.
  if (LOCALES.length < 2) return null;
  return (
    <div className="chiprow" role="group" aria-label={t("Language")}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={`chip ${active === code ? "active" : ""}`}
          aria-pressed={active === code}
          // `lang` on the button so a screen reader pronounces "Español" in
          // Spanish rather than reading it as English. The NAMES are never
          // translated: somebody looking for their own language is looking for
          // the word they already know.
          lang={code}
          title={LOCALE_NAMES[code]}
          aria-label={LOCALE_NAMES[code]}
          onClick={() => setAppLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
