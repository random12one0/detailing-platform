// ROADMAP 101.7 — LEAVING A SETTINGS SCREEN WITH SOMETHING UNSAVED ASKS, IN
// PLACE. Andrew, 2026-10-23: B. A screen with a Save button tells
// `SettingsHost` whether it holds unsaved changes and how to save them; the
// back arrow, the X and Escape then ask "Save and go back" or "Leave without
// saving" under the header instead of silently dropping what was typed.
// Never the browser's grey `confirm()` box.
//
// `guard` is `{ dirty, save, blocked }`: `save` resolves true when the write
// landed; `blocked` means the screen's own Save is refusing right now (a sale
// switched on at 0%, ROADMAP 101.8), so "Save and go back" is refused too.
// Its own file so a screen importing it does not import SettingsHost, which
// imports every screen.
import { createContext, useContext, useEffect } from "react";

export const LeaveGuard = createContext(null);

export function useLeaveGuard(guard) {
  const slot = useContext(LeaveGuard);
  useEffect(() => {
    if (!slot) return undefined;
    slot.current = guard;
    return () => { slot.current = null; };
  });
}
