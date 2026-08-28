// Motion for the landing page.
// ------------------------------------------------------------------
// The direction is "Raking Light": a work lamp passing over paint. So the
// motion vocabulary is light and material, not slide-and-bounce —
//
//   the lamp strikes    the accent bar lands before the surface it lights
//   the light passes    a specular sweep travels across the headline
//   the type opens      Anybody's width axis widens as a heading arrives
//   the panel settles   content rises a few pixels into place, never far
//
// Rules this file keeps:
//  * transform and opacity only, so nothing reflows mid-animation.
//  * every effect has a reduced-motion path that lands on the final state
//    IMMEDIATELY — not a faster version of the same thing.
//  * a safety net: if an observer never fires (bfcache, an old browser, a
//    headless renderer), content is revealed anyway. A landing page that
//    hides its own copy is worse than one that doesn't animate.

import { useEffect, useRef, useState } from "react";

export const prefersReduced = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const REVEAL_FAILSAFE_MS = 3000;

// Adds `.in` when the element arrives in view, once.
export function useReveal({ threshold = 0.15, margin = "0px 0px -10% 0px" } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("in");
        io.disconnect();
      },
      { threshold, rootMargin: margin },
    );
    io.observe(el);
    const failsafe = setTimeout(() => el.classList.add("in"), REVEAL_FAILSAFE_MS);
    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, [threshold, margin]);
  return ref;
}

// The opening sequence waits for the display face, so the headline never
// swaps typeface in front of the reader — the one FOUT that would undo the
// whole "premium" impression. Capped, because a font CDN can hang.
export function useIntro() {
  const [ready, setReady] = useState(() => prefersReduced());
  useEffect(() => {
    if (prefersReduced()) { setReady(true); return; }
    let done = false;
    const go = () => { if (!done) { done = true; setReady(true); } };
    const cap = setTimeout(go, 900);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(go)).catch(go);
    } else {
      go();
    }
    return () => clearTimeout(cap);
  }, []);
  return ready;
}

// Cursor parallax on the hero's demo card. Fine pointers only: on a phone
// there is no cursor, and a touch-driven tilt just fights the scroll.
export function useTilt(maxDeg = 5) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(-py * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--lx", `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--ly", `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [maxDeg]);
  return ref;
}

// The light inside a button follows the cursor across it.
export function usePointerGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);
  return ref;
}

// A hairline of accent across the top, tracking how far down the page you
// are. Written as a CSS variable so the paint stays on the compositor.
export function useScrollProgress() {
  useEffect(() => {
    if (prefersReduced()) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        document.documentElement.style.setProperty("--ld-progress", p.toFixed(4));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
}

// Depth: an element drifts a little slower than the page it sits on. Kept
// to a dozen pixels — enough to feel like the card is nearer than the
// ground, not enough to read as an effect.
export function useParallax(strength = 14) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        // -1 above the fold to +1 below it.
        const centre = (r.top + r.height / 2) / window.innerHeight;
        const offset = (0.5 - centre) * 2 * strength;
        el.style.setProperty("--py", `${offset.toFixed(1)}px`);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [strength]);
  return ref;
}

// A figure that counts up when it arrives. The final string is rendered
// first and its width reserved in `ch`, so the count never nudges the
// layout — the numbers are mono and tabular for the same reason.
export function CountUp({ value, prefix = "", suffix = "", duration = 850, className = "" }) {
  const ref = useRef(null);
  const final = `${prefix}${value.toLocaleString("en-US")}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      el.textContent = final;
      return;
    }
    let raf = 0, start = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const step = (t) => {
          if (!start) start = t;
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);   // decelerate into place
          const n = Math.round(value * eased);
          el.textContent = `${prefix}${n.toLocaleString("en-US")}${suffix}`;
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, prefix, suffix, duration, final]);

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: "inline-block", minWidth: `${final.length}ch` }}
    >
      {final}
    </span>
  );
}
