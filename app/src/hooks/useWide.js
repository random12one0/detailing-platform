// Is the viewport at least this wide?
//
// One place, because six screens each writing their own width check is how
// the 320 floor got fixed on one screen and not its neighbour twice already
// (docs/dashboard-component-inventory-2026-08-31.md §2). The two widths this
// product asks about are the only two the desktop specification derives:
// 1024, where the tab bar becomes a rail, and 1180 (--wrap), where a second
// column engages.
//
// Most of the desk layout is CSS and should stay CSS. This is for the places
// where the two widths show DIFFERENT CONTENT rather than the same content
// arranged differently — Today's ledger is three bare figures on a phone and
// a two-cell sunken strip at a desk, which is not one markup with a media
// query on it.

import { useEffect, useState } from "react";

export function useWide(px = 1180) {
  const q = `(min-width: ${px}px)`;
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return wide;
}
