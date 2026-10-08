// ROADMAP 2.15a — A TENANT NAME IS AT MOST SIXTY CHARACTERS, SAID BY THE SERVER.
//
// The chain this closes, written out because each link looks sufficient on its
// own:
//
//   the box        `maxLength={60}` on five inputs — one element, nothing else
//   the server     THIS, for the only name an edge function writes
//   the column     `char_length(name) between 1 and 60`, in
//                  `20261007010000_tenant_string_lengths.sql` (a file; not applied)
//
// **WITHOUT THE MIDDLE LINK THE BOTTOM ONE SPEAKS POSTGRES.** A violated CHECK
// is `23514`, which Supabase hands back as a 400 whose body names the
// constraint — *"new row for relation \"businesses\" violates check constraint
// \"businesses_name_len\""*. That is the sentence a detailer would read at
// signup. So this module exists to say the same no in words, BEFORE the
// database is asked.
//
// ---------------------------------------------------------------------------
// WHY A `.js` MODULE FOR ONE COMPARISON
// ---------------------------------------------------------------------------
// **Nothing in `supabase/` is type-checked or runnable on this machine** —
// there is no Deno, the deploy bundler does not type-check, and
// `_shared/email.ts` records a type error that shipped and put the word
// `undefined` into every detailer's email as a colour. So the rule lives in a
// plain `.js` module that `tests/name-length.test.mjs` can import and EXECUTE,
// the pattern `_shared/brandColor.js` and `_shared/platformNet.js` already set.
//
// ---------------------------------------------------------------------------
// IT COUNTS CODE POINTS, BECAUSE THAT IS WHAT POSTGRES COUNTS
// ---------------------------------------------------------------------------
// `char_length` counts characters. JavaScript's `.length` counts UTF-16 code
// units, and an emoji is two of those. **A server that counted `.length` would
// be STRICTER than the column it is protecting** — it would refuse a 60-emoji
// name that the database would have accepted, which is a refusal with no
// authority behind it. `[...name].length` counts the same things Postgres does.
//
// It also counts the TRIMMED value, because the trimmed value is what gets
// stored. Checking before the trim would refuse a name that fits.
//
// ---------------------------------------------------------------------------
// ENGLISH ONLY, AND THAT IS THE EXISTING SHAPE RATHER THAN A SHORTCUT
// ---------------------------------------------------------------------------
// **No edge function in this repo localizes an HTTP refusal.** `grep -rn
// "error: tt(" supabase/functions` returns nothing; `tt()` and
// `_shared/strings/es.ts` are email copy, and `_shared/i18n.ts` says in its own
// header that the language is always an argument because there is no ambient
// locale in a function. Every other sentence `createBusinessRow` can return —
// *"A business name is required."*, *"That web address is already taken."* — is
// English today. **A single Spanish exception for one of six refusals would
// read as a bug, not as progress**, so this follows the file it lives in. The
// gap is real and is named under 2.15a: the signup screen can be in Spanish
// while every refusal it can provoke is in English.

/** The cap. The same 60 as the five boxes and the column. */
export const NAME_MAX = 60;

/**
 * `{ ok: true, value }` for a name that may be stored, `{ ok: false, error }`
 * for one that may not. The caller stores `value` — it is trimmed, and trimming
 * is part of the decision rather than something the caller repeats.
 *
 * An empty name is refused here too, which keeps this function the single
 * answer to "is this a storable name" instead of half of it.
 */
export function checkName(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: false, error: "A business name is required." };
  // CODE POINTS, NOT `.length`. See the header.
  if ([...value].length > NAME_MAX) {
    return {
      ok: false,
      // The number is in the sentence on purpose: "too long" leaves a person
      // deleting characters one at a time to find out how many.
      error: `A business name can be at most ${NAME_MAX} characters. Shorten it and try again.`,
    };
  }
  return { ok: true, value };
}
