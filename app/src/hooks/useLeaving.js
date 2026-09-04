// Hold a close open long enough for it to animate out.
//
// ANYTHING THAT OPENS, ANIMATES IN — AND OUT (roadmap 2.17, the owner's rule;
// docs/design-system.md § Motion). React removes an element from the tree the
// moment its caller stops rendering it, so there is nothing left for CSS to
// animate: an exit has to be a state that delays the unmount. `Sheet.jsx` has
// carried that pattern since it was written — setLeaving(true), wait, then
// onClose — and this is the same ten lines, lifted once the desk retrofit
// needed them in a THIRD place (RecordHost, SettingsHost, the calendar's day
// panel). Sheet keeps its own copy: it also drags, and its close is entangled
// with the drag's dismiss threshold.
//
// THE DURATION LIVES HERE AND NOWHERE ELSE. It was written out in two files
// first, each with a comment saying it must track --t-exit, which is the shape
// of a number that drifts. One constant, one comment: if --t-exit moves in
// theme.css, move it here.
import { useCallback, useEffect, useRef, useState } from "react";

export const EXIT_MS = 180;   // == --t-exit in theme.css

// `enabled` is the width check. Below --wrap none of the three containers this
// serves is a second column — a record is a .sheet with its own exit, a
// settings screen is a page, the day panel is inline under the month — so the
// delay would be 180ms of a dead control and no animation to fill it.
//
// AND REDUCED MOTION SKIPS THE WAIT ENTIRELY. `.lite` is set on <html> by
// ?lite=1 and by prefers-reduced-motion (main.jsx), and it switches the
// animation off — so without this the close would hold the element in its
// START state for 180ms and then cut, which is the exact opposite of the
// degradation rule (docs/design-system.md § Degradation: render the END state
// the animation was travelling to). It is also the wrong 180ms to spend on the
// people most likely to have asked for less motion. Read at call time rather
// than captured, because nothing here re-renders when the class changes.
export function useLeaving(onClose, enabled = true) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const close = useCallback(() => {
    if (!enabled || document.documentElement.classList.contains("lite")) { onClose?.(); return; }
    if (timer.current) return;   // already going; a second press is not a second exit
    setLeaving(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLeaving(false);
      onClose?.();
    }, EXIT_MS);
  }, [onClose, enabled]);

  return [leaving, close];
}
