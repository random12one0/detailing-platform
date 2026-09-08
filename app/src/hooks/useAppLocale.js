// ROADMAP 8.17 STAGE 2B — what makes the DASHBOARD repaint when the language
// changes. The twin of `useLocale.js`, against the other scope.
//
// **`useSyncExternalStore`, not a context**, for the reason its twin gives: a
// context would be threaded through every screen and every one of them is a
// place to forget it. `t()` is a plain function any module can call; this hook
// exists only so React knows the answer changed.
//
// **CALL IT IN ANY COMPONENT THAT RENDERS TRANSLATED TEXT**, not once at the
// root. Calling it at the root works today because the whole tree re-renders,
// and it stops working the first time somebody memoises a screen — silently,
// in the language nobody here can read.
import { useSyncExternalStore } from "react";
import { getAppLocale, subscribeApp } from "../lib/appI18n.js";

export function useAppLocale() {
  return useSyncExternalStore(subscribeApp, getAppLocale, () => "en");
}
