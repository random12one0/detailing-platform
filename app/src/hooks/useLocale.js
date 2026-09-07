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
import { useSyncExternalStore } from "react";
import { getLocale, subscribe } from "../lib/i18n.js";

export function useLocale() {
  return useSyncExternalStore(subscribe, getLocale, () => "en");
}
