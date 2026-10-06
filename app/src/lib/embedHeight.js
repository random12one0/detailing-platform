// THE BOOKING PAGE TELLS THE SETTINGS SCREEN HOW TALL IT IS — AND ONLY THEN.
//
// `PagePreview` shows the real `/book/<slug>` in an iframe, and a cross-
// document iframe cannot size itself to its content. The first version gave
// the frame a guessed height (`min(72vh, 900px)`), which cut the page off or
// left blank floor under it. The objection to asking the page for its height
// was that a measuring script would sit in the PUBLIC booking page to serve a
// settings screen. So it is gated twice, and a customer meets neither:
//
//   1. `?pv=1` on the address — only `PagePreview` writes that;
//   2. the page is actually inside a frame.
//
// Without both this file does nothing: no timer, no listener, no class, no
// message. A customer's page is byte-for-byte as it was.
//
// WHILE EMBEDDED, `.pv-embed` drops the two `min-height: 100dvh` / `70dvh`
// rules in booking.css. Left in, the page is never shorter than the frame it
// is in, so the measurement could only ever grow.
//
// ponytail: a 250ms poll, not a ResizeObserver. The element to observe is
// replaced (loading, then page) and fonts and photos change its height after
// that; the poll catches all of it in six lines. It only runs in the frame.

export const PV_HEIGHT = "dp.pv.height";

export function installEmbedHeight() {
  if (window.self === window.top) return;
  if (!window.location.pathname.startsWith("/book/")) return;
  if (new URLSearchParams(window.location.search).get("pv") !== "1") return;
  document.documentElement.classList.add("pv-embed");
  let last = 0;
  setInterval(() => {
    const h = Math.ceil(document.querySelector(".bk")?.getBoundingClientRect().height || 0);
    if (h && h !== last) {
      last = h;
      // A bare number, nothing about the business: the parent checks the sender.
      window.parent.postMessage({ type: PV_HEIGHT, height: h }, "*");
    }
  }, 250);
}
