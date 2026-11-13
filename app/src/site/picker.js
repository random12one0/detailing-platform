// THE PICKER (STUDIO-SPEC.md §6d, §7 row S4). Inside the Studio's phone preview only: /site/preview on the dev
// server (main.jsx installs it; a production build has no preview route, so it never ships to a customer).
//
// In Select mode a tap does not follow the link or press the button. It finds the nearest data-from / data-part /
// data-section, outlines it, and posts {revision, section, part, from, item, name, text, bounds} to the Studio. In
// Browse mode the site works as a customer's would. The Studio says which mode, and names the outlined part.
//
// It listens only to its own parent page, and only from an allowed origin (`allowed(origin)`); it posts only to the
// origin that handed it the revision, never to "*". The Studio, for its part, takes a pick only from the preview's
// origin and only for the revision it is showing.

const STYLE = `
html.stu-select [data-section] *{cursor:pointer}
html.stu-select [data-from]{outline:1px dashed rgba(56,224,139,.75);outline-offset:2px}
.stu-pick{position:absolute;z-index:2147483646;pointer-events:none;border:2px solid #38E08B;border-radius:6px;box-shadow:0 0 0 3px rgba(11,13,14,.55)}
.stu-pick b{position:absolute;left:0;top:0;padding:2px 7px;border-radius:5px;background:#38E08B;color:#05210F;
  font:600 12px/1.4 ui-monospace,Menlo,Consolas,monospace;white-space:nowrap}
.stu-pick b:empty,.stu-pick b[hidden]{display:none}`;

// THE TAG NEVER COVERS CONTENT (Andrew: zero visual problems). It goes in the first free spot of: above the outline at
// the left, above at the right, below at the left, below at the right; a spot is free when it stays on the screen
// and touches no text, picture or control on the page. When none is free the tag is not drawn (the Studio's sheet
// names the part anyway).
const GAP = 3;
function contentBoxes(skip) {
  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !skip.contains(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const range = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) { range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width && r.height) out.push(r); }
  for (const e of document.querySelectorAll("img, svg, video, button, input, select, textarea, a.site-btn")) {
    if (skip.contains(e)) continue;
    const r = e.getBoundingClientRect(); if (r.width && r.height) out.push(r);
  }
  return out;
}
const hits = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
export function tagSpot(outlineRect, w, h, boxes, viewW) {
  const o = outlineRect, spots = [
    { left: o.left, top: o.top - GAP - h }, { left: o.right - w, top: o.top - GAP - h },
    { left: o.left, top: o.bottom + GAP }, { left: o.right - w, top: o.bottom + GAP },
  ];
  for (const sp of spots) {
    const r = { left: sp.left, top: sp.top, right: sp.left + w, bottom: sp.top + h };
    if (r.left < 0 || r.right > viewW) continue;
    if (!boxes.some((b) => hits(r, b))) return sp;
  }
  return null;
}

const idOf = (from) => /^(?:service|service_group|gallery):([\w-]+)/.exec(from || "")?.[1] ?? null;
const clip = (s, n = 200) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

export function startPicker({ allowed }) {
  let parentOrigin = null, revision = null, mode = "browse", picked = null, box = null;
  const style = Object.assign(document.createElement("style"), { textContent: STYLE });
  document.head.appendChild(style);

  const outline = () => {
    if (!picked?.isConnected) { box?.remove(); box = null; picked = null; return; }
    if (!box) { box = document.createElement("div"); box.className = "stu-pick"; box.appendChild(document.createElement("b")); document.body.appendChild(box); }
    const r = picked.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left + scrollX - 4}px`, top: `${r.top + scrollY - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    placeTag();
  };
  function placeTag() {
    const tag = box?.firstChild; if (!tag || !tag.textContent) return;
    tag.hidden = false;
    const o = box.getBoundingClientRect(), t = tag.getBoundingClientRect();
    const sp = tagSpot({ left: o.left, top: o.top, right: o.right, bottom: o.bottom }, t.width, t.height, contentBoxes(box), document.documentElement.clientWidth);
    if (!sp) { tag.hidden = true; return; }
    Object.assign(tag.style, { left: `${sp.left - o.left}px`, top: `${sp.top - o.top}px` });
  }
  const clear = () => { picked = null; outline(); };
  addEventListener("resize", outline);
  // the site's bar stays at the top while the page scrolls under it: the tag is placed again so it never covers it
  let frame = 0;
  addEventListener("scroll", () => { if (box && !frame) frame = requestAnimationFrame(() => { frame = 0; placeTag(); }); }, { passive: true });

  function pick(e) {
    if (mode !== "select") return;
    // the tap is the Studio's, not the site's: no link followed, no button pressed, no form sent
    e.preventDefault(); e.stopPropagation();
    if (e.type !== "click") return;
    const hit = e.target.closest?.("[data-from],[data-part],[data-section]");
    const sec = hit?.closest("[data-section]");
    if (!hit || !sec) return;
    const fromEl = hit.closest("[data-from]"), from = fromEl && sec.contains(fromEl) ? fromEl.dataset.from : null;
    const part = hit.closest("[data-part]")?.dataset.part ?? null;
    const item = idOf(from) ?? idOf(hit.querySelector?.("[data-from^='service:']")?.dataset.from);
    const name = item ? clip(document.querySelector(`[data-from="service:${item}.name"]`)?.textContent, 80) || null : null;
    picked = hit; outline();
    box.firstChild.textContent = "";
    const r = hit.getBoundingClientRect();
    // the Studio's sheet covers the lower part of the phone: bring the part into the top half
    if (r.top < 0 || r.top > innerHeight * 0.4) scrollBy({ top: r.top - 72, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    parent.postMessage({ type: "studio-pick", revision, section: sec.dataset.section, part, from, item, name, text: clip(hit.textContent),
      bounds: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } }, parentOrigin);
  }
  // not touchstart: stopping that would stop the phone from scrolling the page
  for (const t of ["click", "pointerdown", "mousedown", "submit", "auxclick"]) addEventListener(t, pick, { capture: true, passive: false });

  function setMode(m) {
    mode = m === "select" ? "select" : "browse";
    document.documentElement.classList.toggle("stu-select", mode === "select");
    if (mode === "browse") clear();
  }

  addEventListener("message", (e) => {
    if (e.source !== parent || parent === window || !allowed(e.origin)) return;
    const d = e.data;
    if (d?.type === "studio-mode") setMode(d.mode);
    else if (d?.type === "studio-clear") clear();
    else if (d?.type === "studio-tag" && box) { box.firstChild.textContent = clip(d.text, 40); placeTag(); }
  });

  // main.jsx calls this with every revision it is handed: a new revision clears the old outline
  return {
    revision(origin, rev) { parentOrigin = origin; if (rev !== revision) { revision = rev; clear(); } },
    mode: () => mode,
  };
}
