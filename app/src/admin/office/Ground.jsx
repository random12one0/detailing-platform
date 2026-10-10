// THE MOVING GROUND: slow lines of light that bend away from the pointer, two
// drifting glows, a faint lattice and a still grain. Never flat, never loud.
// Under ?lite=1 or reduced motion it draws one still frame and stops.
import { useEffect, useRef } from "react";

export default function Ground() {
  const cv = useRef(null);
  useEffect(() => {
    const el = cv.current, x = el?.getContext("2d");
    if (!x) return undefined;
    const still = document.documentElement.classList.contains("lite");
    let w, h, dpr, t = 0, mx = -9999, my = -9999, tmx = -9999, tmy = -9999, raf;
    const size = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); w = el.width = innerWidth * dpr; h = el.height = innerHeight * dpr; if (still) frame(); };
    const move = (e) => {
      tmx = e.clientX * dpr; tmy = e.clientY * dpr;
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    };
    const N = 28;
    function frame() {
      t += 0.0014;                       // calmer than the approved mockup, as asked
      mx += (tmx - mx) * 0.08; my += (tmy - my) * 0.08;
      x.clearRect(0, 0, w, h);
      x.globalCompositeOperation = "lighter";
      const R = (200 * dpr) ** 2;
      for (let i = 0; i < N; i++) {
        const base = h * (0.05 + (1.05 * i) / N), amp = h * 0.045 * (1.2 + Math.sin(i * 1.7));
        x.beginPath();
        for (let px = -30 * dpr; px <= w + 30 * dpr; px += 12 * dpr) {
          let y = base + Math.sin((px / w) * 3.1 + t * 2.2 + i * 0.42) * amp + Math.sin((px / w) * 7.3 - t * 1.4 + i) * amp * 0.3 - (px / w) * h * 0.18;
          const dx = px - mx, dy = y - my, dd = dx * dx + dy * dy;
          if (dd < R) { const f = 1 - dd / R; y += Math.sign(dy || 1) * f * f * 60 * dpr; }
          if (px < -29 * dpr) x.moveTo(px, y); else x.lineTo(px, y);
        }
        const a = 0.022 + 0.05 * (0.5 + 0.5 * Math.sin(i * 2.3 + t * 4));
        x.strokeStyle = i % 5 === 0 ? `rgba(95,180,226,${a * 1.3})` : `rgba(56,224,139,${a})`;
        x.lineWidth = (i % 7 === 0 ? 1.8 : 1) * dpr;
        x.stroke();
      }
      if (!still) raf = requestAnimationFrame(frame);
    }
    size(); addEventListener("resize", size);
    if (!still) { addEventListener("pointermove", move, { passive: true }); raf = requestAnimationFrame(frame); }
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); removeEventListener("pointermove", move); };
  }, []);

  return (
    <div className="bo-bg" aria-hidden="true">
      <canvas ref={cv} />
      <div className="bo-glow bo-g1" /><div className="bo-glow bo-g2" /><div className="bo-glow bo-g3" />
      <div className="bo-lattice" /><div className="bo-spot" /><div className="bo-grain" />
    </div>
  );
}
