-- THE REVOKE IN THE MIGRATION BEFORE THIS ONE DID NOTHING — measured, not
-- reasoned about, 2026-09-13, minutes after applying it.
--
-- `20260913002000_translations.sql` says:
--
--     revoke all on function public.translation_put(...) from anon, authenticated;
--
-- and that is a guard that is not a guard. **`create function` grants EXECUTE to
-- PUBLIC by default**, and revoking from `anon` does not take away a grant made
-- to `PUBLIC` — `anon` still holds it through the pseudo-role. Asked of the live
-- database with the anon key:
--
--     translation_spend('deepl', 0) -> 200 {"used":0,"limit":1000000,...}
--     translation_put(bad hash)     -> 400 P0001 "hash … does not match"
--
-- The second one is the damning reply: that exception is raised from INSIDE the
-- function, so an anonymous visitor was executing a `security definer` writer.
-- With a correct hash they could have written translation rows for any business
-- in the product, and `translation_spend` would have let them report DeepL's
-- million characters as spent — turning the gauge into a denial of service on a
-- feature nobody was watching.
--
-- **AND IT LOOKED EXACTLY LIKE A CLOSED DOOR.** The line was there, it named the
-- right roles, it ran without error, and it protected nothing. That is
-- `FOUND.md`'s whole 2026-09-13 finding wearing an eighth costume, in my own
-- new code, one hour after reading the file about it. The repo ALREADY knew:
-- `20260827002000_engine_support.sql` and eight others spell it
-- `from public, anon, authenticated`. The convention was right and I did not
-- copy it.
--
-- The check that would have caught it is now in `tests/translations.test.mjs`
-- § 6, and it asks the live database with the anon key rather than reading the
-- migration text — a suite that grepped for the word `revoke` would have passed
-- on the broken version.
--
-- ── A SEPARATE QUESTION THIS RAISES, PARKED NOT FIXED ───────────────────────
-- Every `security definer` function in this repo is worth the same probe, and
-- `FOUND.md` now carries that as an item. It is not fixed here because a sweep
-- of forty functions is not this item, and because two of them may be
-- deliberately public.

revoke all on function public.translation_put(uuid, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.translation_spend(text, bigint)
  from public, anon, authenticated;
revoke all on function public.translations_never_a_name()
  from public, anon, authenticated;

-- After revoking from PUBLIC the edge function's own role needs saying out
-- loud. It had it by accident before; now it has it on purpose.
grant execute on function public.translation_put(uuid, text, text, text, text, text)
  to service_role;
grant execute on function public.translation_spend(text, bigint)
  to service_role;

-- `get_business_translations` IS meant to be reachable by a customer's browser
-- with no session — it is the public read, the same posture as
-- `get_public_business_profile`. Its grants stay exactly as they are; it is
-- named here only so the next reader does not assume it was forgotten.
