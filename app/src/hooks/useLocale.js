// ROADMAP 8.17 — what makes a language change repaint the page.
//
// **`useSyncExternalStore`, NOT A CONTEXT.** A context would have to be
// threaded from the page root through fourteen components, and every one of
// them would be a place to forget it — which is the same shape as the `site`
// argument roadmap 3.3 made required for exactly that reason. `t()` is a plain
// function any module can call; this hook exists only so React knows when the
// answer changed.
//
// **CALL IT IN ANY COMPONENT THAT RENDERS TRANSLATED TEXT.** Calling it once
// at the root works today because the whole tree re-renders — and it will stop
// working the first time somebody memoises a step, silently, in the language
// nobody here can read. One line per component is the cheap version of never
// finding that out.
//
// **AND IT IS WHAT STAMPS `<html lang>` — 2026-09-12.** The store used to do
// that at module load, where it cannot know which of the two surfaces is about
// to mount; both scopes ran it and the last module evaluated won. The hook is
// the right place because only a booking page ever calls this one.
import { useEffect, useSyncExternalStore } from "react";
import { getLocale, stampLang, subscribe } from "../lib/i18n.js";

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getLocale, () => "en");
  useEffect(stampLang, [locale]);
  return locale;
}
