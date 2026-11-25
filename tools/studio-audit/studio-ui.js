// STUDIO — the page side. Loaded by ui.html; draws into #viewStudio. Server: studio.mjs.
// Screens (STUDIO-SPEC.md §3): Studio home (sites, status, last check); a site: the EDITOR (screen 4, S4: phone
// preview with Browse / Select, tap a part, change its words or see where its facts come from, change cards, go back
// to any revision), the connection check as a tick list like mockup screen 5, the revision list; and the Studio's
// own settings. Phone first: one pane at a time with sheets rising from the bottom; from 1100 px three columns
// (cards and revisions · the phone · the selected part and the check).
(() => {
  const root = () => document.getElementById("viewStudio");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const get = async (p) => { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw new Error(r.status === 404 ? "not found" : "HTTP " + r.status); return r.json(); };
  const post = async (p, b = {}) => {
    const r = await fetch(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
    try { return await r.json(); } catch { return { ok: false, said: `The Control Room answered ${r.status}.` }; }
  };
  const ago = (iso) => {
    const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
    if (!(s >= 0)) return "";
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  };
  // R5-P2-4: lower-case am/pm, like every other clock in the Control Room ("Nov 7, 10:34 am", not "10:34 AM")
  const when = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()); };
  const IC = {
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 15l6-6M7.5 11.5l-2 2a3.5 3.5 0 005 5l2-2M16.5 12.5l2-2a3.5 3.5 0 00-5-5l-2 2"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>',
  };
  // What the check will do, before it has run: the check's own list (studio-check.mjs --plan), sent by the server.
  const plan = () => ST.ov?.plan || [];
  // S6: Looks (screen 3), Data (screen 5: the live data and the connection check) and Critic (screen 6). On a desktop
  // the editor's columns stay as they were; Looks and Critic take the whole width, through the view switch.
  // S7: Detailer (links the detailer opens, their comments, the emails waiting for your yes)
  // S8: Publish (what stands between a revision and going live, the releases, rollback, the nightly check)
  const PANES = [["preview", "Edit"], ["chat", "Chat"], ["looks", "Looks"], ["check", "Data"], ["critic", "Critic"], ["detail", "Detailer"], ["live", "Publish"], ["revs", "Revisions"]];
  const WIDEPANES = ["looks", "critic", "detail", "live"];
  const LOCAL = /^(127\.|localhost$|\[::1\]$)/.test(location.hostname);
  const WIDE = () => matchMedia("(min-width:1100px)").matches;

  // ---- plain names for the parts of a site, and where each dashboard fact is changed
  const SECTION = { hero: "First screen", catalog: "Prices", proof: "Photos and reviews", visit: "Hours and contact", booking: "Booking" };
  const FIELD = { headline: "Headline", eyebrow: "Small line above the headline", sub: "Line under the headline", title: "Title", intro: "Intro" };
  const FIELD_ORDER = ["eyebrow", "headline", "sub", "title", "intro"];
  // [what it is, the dashboard place] — the platform dashboard's own screen names (Business › …)
  function bound(from, name) {
    const m = /^service:[\w-]+\.(\w+)$/.exec(from || ""), x = name ? `“${name}”` : "this service";
    if (m) return {
      price: ["A price", `The price of ${x}`], name: ["A service name", `The name of ${x}`], description: ["A service description", `What ${x} is, in the detailer's words`],
      duration: ["How long it takes", `How long ${x} takes`], features: ["What is included", `What ${x} includes`], sizes: ["Prices by vehicle size", `What ${x} costs more for a bigger vehicle`],
    }[m[1]]?.concat("Services & add-ons") || ["A service", `Part of ${x}`, "Services & add-ons"];
    const k = /^[a-z_.]+/.exec(from || "")?.[0];
    return ({
      service_group: ["Services and prices", "The services in this group, with their prices", "Services & add-ons"],
      add_ons: ["Add-ons", "The add-ons and their prices", "Services & add-ons"],
      plans: ["Monthly plans", "The monthly plans and their prices", "Monthly plans"],
      sale: ["The sale", "The site-wide sale while it runs", "Promo codes & sale"],
      gallery: ["A photo", "A photo of the detailer's work", "Photo gallery"], "gallery.best": ["Photos", "The detailer's best photos, in their order", "Photo gallery"],
      "reviews.top": ["Reviews", "Reviews from customers, in the detailer's order", "Reviews"],
      "hours.week": ["Hours", "The opening hours for each day", "Hours & days off"],
      area: ["The area served", "Where the detailer works", "Business info"],
      "contact.phone": ["The phone number", "The phone number for calls and texts", "Business info"],
      faq: ["Questions and answers", "The questions and answers", "FAQ"], pay: ["How to pay", "How customers can pay", "How you get paid"],
      book: ["The booking form", "The booking form. Its services, prices and free times come straight from the booking system", "Booking rules"],
    })[k] || ["From the dashboard", "Something the dashboard holds", "Business"];
  }

  const ST = { screen: "home", site: null, rev: null, pane: "preview", ov: null, detail: null, err: null, msg: {}, busy: {}, shown: null, specs: {},
    mode: "select", pick: null, sheet: null, previewCard: null, draft: null, editErr: null, frameReady: false, sentKey: null, askDraft: null, via: null, partVia: null };
  try { Object.assign(ST, JSON.parse(localStorage.getItem("studioAt") || "{}")); } catch {}
  if (!["home", "site", "settings"].includes(ST.screen)) ST.screen = "home";
  if (!PANES.some(([k]) => k === ST.pane)) ST.pane = "preview";
  if (!["browse", "select"].includes(ST.mode)) ST.mode = "select";
  const keep = () => { try { localStorage.setItem("studioAt", JSON.stringify({ screen: ST.screen, site: ST.site, rev: ST.rev, pane: ST.pane, mode: ST.mode })); } catch {} };
  const visible = () => { const r = root(); return r && !r.hidden; };

  async function load() {
    try {
      const ov = await get("/api/studio/overview");
      // a Studio that cannot use its folder says so in its own words (and its settings stay one press away)
      if (!ov || !Array.isArray(ov.sites)) throw new Error(ov?.said || "The Control Room sent the Studio nothing it could read.");
      ST.ov = ov;
      if (ST.screen === "site" && ST.site) {
        ST.detail = await get("/api/studio/site?id=" + encodeURIComponent(ST.site)).catch(() => null);
        if (!ST.detail) { ST.screen = "home"; ST.site = null; keep(); }
        else if (!ST.detail.revisions.some((r) => r.n === ST.rev)) ST.rev = ST.detail.revisions[0]?.n ?? null;
        if (ST.previewCard && !ST.detail?.cards.some((c) => c.id === ST.previewCard && c.status === "proposed")) ST.previewCard = null;
        const c = ST.detail && checkFor(ST.rev);
        if (c && (!ST.shown || ST.shown.id !== c.id || ST.shown.running)) ST.shown = await get(`/api/studio/check?site=${encodeURIComponent(ST.site)}&id=${c.id}`).catch(() => null);
        if (!c) ST.shown = null;
        if (ST.rev) await specFor(ST.rev).catch(() => null);
        // the live data (screen 5) is read from the test dashboard only when it is on screen, and at most once a minute
        const dk = `${ST.site}/${ST.detail?.latest}`;
        if (ST.detail && (ST.pane === "check" || WIDE()) && (!ST.data || ST.data.key !== dk || Date.now() - ST.data.got > 60000) && !ST.dataBusy) {
          ST.dataBusy = true;
          get("/api/studio/data?site=" + encodeURIComponent(ST.site)).then((r) => { ST.data = { key: dk, got: Date.now(), r }; }, (e) => { ST.data = { key: dk, got: Date.now(), r: { ok: false, said: e.message } }; })
            .finally(() => { ST.dataBusy = false; paint(); });
        }
      }
      ST.err = null;
    } catch (e) { ST.err = e.message; }
    paint();
  }
  const specFor = async (n) => (ST.specs[`${ST.site}/${n}`] ||= (await get(`/api/studio/revision?site=${encodeURIComponent(ST.site)}&n=${n}`)).spec);
  const shownSpec = () => ST.specs[`${ST.site}/${ST.rev}`] || null;
  const latest = () => ST.detail?.latest ?? null;
  const onLatest = () => ST.rev != null && ST.rev === latest();
  const canSelect = () => onLatest() && !ST.previewCard;
  // the check to show for a revision: the one running on it, else its latest
  function checkFor(n) {
    const run = ST.ov?.check;
    if (run && run.site === ST.site && run.rev === n) return { id: run.id, running: true };
    return ST.detail?.checks.find((c) => c.rev === n) || null;
  }

  // ---------------------------------------------------------------- paint
  // Polling repaints only what changed, and keeps the keyboard focus where it was.
  const focusKey = (f) => [f.dataset.act, f.dataset.site, f.dataset.n, f.dataset.pane, f.dataset.to, f.dataset.id, f.dataset.m, f.dataset.field].join("|");
  // A repaint never replaces a control while a finger or the mouse is pressing it, or the press would land on a
  // control that is gone (seen once in a click test, when the 1.2 s refresh fell inside a click). It runs on release.
  let pressing = false;
  addEventListener("pointerdown", (e) => { pressing = !!root()?.contains(e.target); }, true);
  for (const t of ["pointerup", "pointercancel"]) addEventListener(t, () => { if (pressing) { pressing = false; setTimeout(paint, 0); } }, true);
  function swap(el, html) {
    if (!el || el._html === html || pressing) return;
    const f = document.activeElement, key = f && el.contains(f) && f.dataset?.act ? focusKey(f) : null;
    el.innerHTML = html; el._html = html;
    if (key) for (const b of el.querySelectorAll("[data-act]")) if (focusKey(b) === key) { b.focus({ preventScroll: true }); break; }
  }
  // the entrance plays once per screen, not on every repaint
  function enter(box) { if (box.dataset.screen !== box.dataset.entered) { box.dataset.entered = box.dataset.screen; box.classList.add("enter"); setTimeout(() => box.classList.remove("enter"), 450); } }
  function paint() {
    const el = root(); if (!el) return;
    if (!el.dataset.built) {
      el.dataset.built = "1";
      el.innerHTML = '<div class="stu"><p class="smsg bad off" id="stuOff" role="alert" hidden>The Control Room is not answering. Trying again…</p><div class="stuin" id="stuBox"></div></div>';
      el.addEventListener("click", onClick); el.addEventListener("submit", onSubmit);
      // the speech-to-text mic stops its own click from bubbling, so "spoken" is noted on the way down
      el.addEventListener("click", (e) => { if (e.target.closest?.("#stuAskPart .boxmic")) ST.partVia = "voice"; }, true); el.addEventListener("input", onInput); el.addEventListener("keydown", onKey);
      // R5-P2-3: Escape closes an open phone sheet wherever focus has gone (Tab leaves the sheet for the strip and the
      // tab bar, and Escape there did nothing); keys inside Studio are handled by onKey
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ST.sheet && !WIDE() && !el.contains(e.target) && el.offsetParent !== null) { e.preventDefault(); closeSheet(); } });
    }
    const box = document.getElementById("stuBox");
    document.getElementById("stuOff").hidden = !(ST.err && ST.ov);
    // EVERY STATE has the Studio's heading and a way to its settings: still loading, could not load, or loaded
    // (live install, 2026-11-05: a slow first answer left ui-check with no Studio and no settings button for 20 s).
    if (!ST.ov) {
      const set = ST.screen === "settings", what = ST.err
        ? `<div class="scard pad" role="alert"><p><b>The Studio could not load.</b> ${esc(ST.err)}</p><div class="row"><button class="sbtn" data-act="reload">Try again</button></div></div>`
        : `<p class="sdim" aria-busy="true">${set ? "Loading the Studio settings…" : "Loading the sites…"}</p>`;
      box.dataset.screen = ""; box._html = null;
      box.innerHTML = (set ? settingsHead() : homeHead()) + what;
      return;
    }
    if (ST.screen === "settings") { if (box.dataset.screen !== "settings") { box.dataset.screen = "settings"; swap(box, settingsHtml()); enter(box); } return; }
    if (ST.screen === "site" && ST.detail) return paintSite(box);
    if (box.dataset.screen !== "home") box._html = null;
    box.dataset.screen = "home";
    swap(box, homeHtml()); enter(box);
  }

  const wire = (c) => {
    if (!c) return `<span class="wire off">${IC.link}Not checked yet</span>`;
    if (c.ok) return `<span class="wire">${IC.link}Connected · ${c.passed} of ${c.passed + c.failed + (c.skipped || 0)} · revision ${c.rev}</span>`;
    return `<span class="wire bad">${IC.bad}Check failed${c.failed ? ` · ${c.failed} red` : ""} · revision ${c.rev}</span>`;
  };
  const homeHead = () => `<header class="shead"><div class="t"><p class="eye">Studio</p><h1 class="big">Websites</h1>
      <p class="lede">Detailer websites made in the Studio. Their prices, hours, photos and reviews are read from each detailer's dashboard, never copied into the site.</p></div>
      <button class="sbtn ghost" data-act="go" data-to="settings">${IC.gear}Studio settings</button></header>`;
  const settingsHead = () => `<header class="shead"><div class="t"><button class="sbtn ghost back" data-act="go" data-to="home">${IC.back}Studio</button>
      <h1 class="big">Studio settings</h1><p class="lede">How the Studio works. These are the Studio's own; the Control Room's Settings are separate.</p></div></header>`;
  function homeHtml() {
    const o = ST.ov, sites = o.sites;
    const head = homeHead();
    const list = sites.length ? `<div class="sites">${sites.map((s) => {
      const st = s.latestCheck || null, older = !st && s.lastCheck;
      return `<button class="scard site ${st?.ok ? "live" : st ? "bad" : older ? "need" : ""}" data-act="open" data-site="${esc(s.id)}">
        <span class="thumb">${s.shot ? `<img src="/api/studio/shot?site=${encodeURIComponent(s.id)}&id=${esc(s.shot)}" alt="" loading="lazy" width="390" height="844">` : '<span class="nopic">No picture yet</span>'}</span>
        <span class="sinfo"><span class="name">${esc(s.name)}</span>${s.town ? `<span class="town">${esc(s.town)}</span>` : ""}
          <span class="chips">${s.status === "live" ? '<span class="chip ok">Live</span>' : '<span class="chip">Draft</span>'}${(o.alarms || []).some((a) => a.site === s.id) ? '<span class="chip bad">Alarm</span>' : ""}${s.kind === "example" ? '<span class="chip">Example</span>' : ""}${s.emailsWaiting ? `<span class="chip warn">${s.emailsWaiting === 1 ? "1 email waits for you" : `${s.emailsWaiting} emails wait for you`}</span>` : ""}</span>
          <span class="stat">${older ? `<span class="wire warn">${IC.link}Revision ${s.latest} not checked yet</span>` : wire(st)}</span>
          <span class="stat sdim">${s.revisions} ${s.revisions === 1 ? "revision" : "revisions"}${s.lastCheck ? ` · last check ${ago(s.lastCheck.finished_at)}` : ""}</span></span></button>`;
    }).join("")}</div>`
      : o.example.exists
        ? `<div class="scard pad empty"><h3>No sites yet</h3><p>The Brightline example is ready: a made-up shop with its own test dashboard. Add it to try the phone preview and the connection check.</p>
           <button class="sbtn pri" data-act="example"${ST.busy.example ? " disabled" : ""}>${ST.busy.example ? "Adding…" : "Add the Brightline example"}</button>${msg("example")}</div>`
        : `<div class="scard pad empty"><h3>No sites yet</h3><p>The platform copy at <span class="mono">${esc(o.settings.platform)}</span> has no example site to add. Point Studio settings at the platform copy.</p>
           <button class="sbtn" data-act="go" data-to="settings">Open Studio settings</button></div>`;
    const alarms = (o.alarms || []).map((a) => `<div class="alarm" role="alert"><b>Alarm.</b> ${esc(a.what)} <button class="sbtn sm" data-act="open" data-site="${esc(a.site)}">Open the site</button></div>`).join("");
    return `${head}${alarms}<div class="hgrid"><section aria-labelledby="stuSites"><h2 class="h" id="stuSites">Sites <span class="n">${sites.length}</span></h2>${list}${bizHtml()}${formsHtml()}</section>
      <aside aria-labelledby="stuPrev"><h2 class="h" id="stuPrev">Phone preview</h2>${serverCard()}</aside></div>`;
  }
  // 2026-11-13: the website forms detailers sent (read only), and what the Studio read from their current website.
  // Every answer shows its page and the words it came from; a price found there is only listed, never written anywhere.
  // START FROM A BUSINESS: an address name (a business's slug) becomes a site with a first draft from its brief + dashboard
  function bizHtml() {
    return `<div class="scard pad"><h3>Start from a business</h3><p class="sdim small">Type the business's address name (the part after detailingplatform.com/). The Studio reads its website brief and dashboard from the platform database and makes a first draft.</p>
      <label class="fld"><span>Address name</span><input id="stuBiz" type="text" spellcheck="false" autocomplete="off" placeholder="demo-detail"></label>
      <button class="sbtn pri" data-act="startbiz"${ST.busy.startbiz ? " disabled" : ""}>${ST.busy.startbiz ? "Reading…" : "Start from this business"}</button>${msg("startbiz")}</div>`;
  }
  function formsHtml() {
    const f = ST.ov.forms;
    if (!f) return "";
    const head = `<h2 class="h" id="stuForms">Website forms <span class="n">${f.rows?.length || 0}</span></h2>`;
    if (!f.on) return `<section class="forms" aria-labelledby="stuForms">${head}<p class="sdim">Turn on “Detailer links and website forms” in Studio settings to see the forms detailers send.</p></section>`;
    if (f.said) return `<section class="forms" aria-labelledby="stuForms">${head}<p class="smsg bad">${esc(f.said)}</p></section>`;
    if (!f.rows.length) return `<section class="forms" aria-labelledby="stuForms">${head}<p class="sdim">${f.loading ? "Reading the sent forms…" : "No detailer has sent the website form yet."}</p></section>`;
    const host = (u) => { try { const x = new URL(u); return x.host.replace(/^www\./, "") + (x.pathname === "/" ? "" : x.pathname); } catch { return u; } };
    const one = (r) => {
      const x = r.read, busy = x?.running || x?.status === "reading" || ST.busy["read" + r.business];
      const res = !x ? "" : x.status === "failed" ? `<p class="smsg bad">${esc(x.said)}</p>`
        : x.status !== "done" ? "" : `<details${ST.formOpen?.[r.business] ? " open" : ""}><summary data-act="formopen" data-b="${esc(r.business)}">${Object.keys(x.answers || {}).length} of ${x.questions.length} answers found · ${x.prices.length === 1 ? "1 price" : `${x.prices.length} prices`} · read ${esc(when(x.finished_at))}</summary>
          ${x.said ? `<p class="sdim">${esc(x.said)}</p>` : ""}
          <ul class="fill">${x.questions.map((q) => { const a = x.answers[q.id]; return `<li class="${a ? "got" : "none"}"><b>${esc(q.question)}</b>${q.ticked ? ' <span class="chip">They ticked “It is on my website”</span>' : ""}
            ${a ? `<span class="val">${esc(a.value)}</span><span class="sdim small">From <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(host(a.url))}</a>: “${esc(a.quote)}”</span>` : '<span class="sdim">Not on their website. It stays empty.</span>'}</li>`; }).join("")}</ul>
          ${x.prices.length ? `<h3 class="hs">Prices on their website</h3><p class="sdim small">Only listed here. Prices live in their dashboard; nothing is filled in for them.</p><ul class="fill">${x.prices.map((pr) => `<li class="got"><b>${esc(pr.service)}</b><span class="val">${esc(pr.price)}</span><span class="sdim small">From <a href="${esc(pr.url)}" target="_blank" rel="noopener noreferrer">${esc(host(pr.url))}</a>: “${esc(pr.quote)}”</span></li>`).join("")}</ul>` : ""}
          <p class="sdim small">The detailer sees these answers, with their pages, in their review link, under “Taken from your website. Please check”.</p></details>`;
      return `<li class="scard pad form1"><div class="emh"><b>${esc(r.name)}</b><span class="sdim">sent ${esc(when(r.sent_at))}</span></div>
        <p class="sdim">${r.website ? `Current website: <a href="${esc(r.website)}" target="_blank" rel="noopener noreferrer">${esc(host(r.website))}</a>${r.ticked.length ? ` · “It is on my website” on ${r.ticked.length} ${r.ticked.length === 1 ? "question" : "questions"}` : ""}` : "No current website given."}</p>
        ${res}${r.website ? `<div class="row"><button class="sbtn${x ? "" : " pri"}" data-act="readsite" data-b="${esc(r.business)}"${busy ? " disabled" : ""}>${busy ? "Reading their website…" : x ? "Read it again" : "Read their website"}</button></div>` : ""}${msg("read" + r.business)}</li>`;
    };
    return `<section class="forms" aria-labelledby="stuForms">${head}<ul class="formlist">${f.rows.map(one).join("")}</ul></section>`;
  }
  // The phone preview's two servers. Its buttons say "phone preview" so they are never read as the belt's Start / Stop.
  const ON = "Turn on the phone preview", OFF = "Turn off the phone preview";
  function serverCard() {
    const p = ST.ov.preview, going = p.starting || ST.busy.start, leaving = p.stopping || ST.busy.stop;
    const state = going ? ["run", "Turning on…", "Both servers are starting, hidden on this laptop."]
      : leaving ? ["run", "Turning off…", "Waiting for both servers to stop."]
      : p.running ? ["ok", "On", "Sites show in the phone frame, with test data. Nothing goes to the real dashboard."]
      : p.site || p.data ? ["warn", "Half on", `${p.site ? "The site server answers but the test data does not." : "The test data answers but the site server does not."} ${ON} starts the missing one.`]
      : ["", "Off", "Turn it on to see sites in the phone frame. It runs hidden on this laptop until you turn it off."];
    const btn = p.running && !leaving ? (p.ours ? `<button class="sbtn" data-act="stop">${OFF}</button>` : '<span class="sdim">Turned on outside the Studio.</span>')
      : leaving ? `<button class="sbtn" disabled>Turning off…</button>`
      : `<button class="sbtn pri" data-act="start"${going || !p.platformOk ? " disabled" : ""}>${going ? "Turning on…" : ON}</button>`;
    return `<div class="scard pad server"><p class="sline"><i class="dot ${state[0]}" aria-hidden="true"></i><b>${state[1]}</b></p><p class="sdim">${state[2]}</p>
      ${p.error && !going ? `<p class="smsg bad" role="alert">${esc(p.error)}</p>` : ""}${p.note && !p.running && !going ? `<p class="sdim small">${esc(p.note)}</p>` : ""}${!p.platformOk ? `<p class="smsg bad">${esc(p.platformWhy)} Change it in Studio settings.</p>` : ""}
      <div class="row">${btn}</div>${msg("server")}</div>`;
  }
  const msg = (k) => (ST.msg[k] ? `<p class="smsg ${ST.msg[k].ok ? "ok" : "bad"}" role="status">${esc(ST.msg[k].said)}</p>` : "");

  // ---- a site. The phone frame is built once per preview state, so polling never reloads it; a new revision is
  // posted into the same frame.
  function paintSite(box) {
    const d = ST.detail, s = d.site, rev = d.revisions.find((r) => r.n === ST.rev);
    if (box.dataset.screen !== "site:" + s.id) {
      box.dataset.screen = "site:" + s.id;
      box.innerHTML = `<div class="sitehead"><button class="sbtn ghost back" data-act="go" data-to="home">${IC.back}Studio</button>
          <div class="tl"><h1 class="mid">${esc(s.name)}</h1><span class="chip" id="stuRevChip"></span></div></div>
        <div class="seg" role="tablist" aria-label="This site">${PANES.map(([k, l]) => `<button role="tab" id="stuTab-${k}" aria-controls="stuPane-${k}" data-act="pane" data-pane="${k}">${l}</button>`).join("")}</div>
        <div class="vseg" role="group" aria-label="What to show">${[["preview", "Editor"], ["looks", "Looks"], ["critic", "Critic"], ["detail", "Detailer"], ["live", "Publish"]].map(([k, l]) => `<button data-act="pane" data-pane="${k}" data-v="${k}">${l}</button>`).join("")}</div>
        <div class="sgrid"><div class="scol left">${chatShell()}<section class="sheet cards" id="stuCards" aria-labelledby="stuCardsH"></section>
            <section class="pane" id="stuPane-revs" role="tabpanel" aria-labelledby="stuTab-revs"></section></div>
          <section class="pane" id="stuPane-preview" role="tabpanel" aria-labelledby="stuTab-preview"><div id="stuTools"></div><div id="stuStage"></div></section>
          <div class="scol right"><section class="sheet insp" id="stuInsp" aria-label="The part you picked"></section>
            <section class="pane" id="stuPane-check" role="tabpanel" aria-labelledby="stuTab-check"><div id="stuData"></div><div id="stuCheck"></div></section></div></div>
        <section class="pane wide" id="stuPane-looks" role="tabpanel" aria-labelledby="stuTab-looks"></section>
        <section class="pane wide" id="stuPane-critic" role="tabpanel" aria-labelledby="stuTab-critic"></section>
        <section class="pane wide" id="stuPane-detail" role="tabpanel" aria-labelledby="stuTab-detail"></section>
        <section class="pane wide" id="stuPane-live" role="tabpanel" aria-labelledby="stuTab-live"></section>`;
      box._html = null; ST.stageKey = null; ST.frameReady = false; ST.sentKey = null; ST.threadKey = null; enter(box);
      wireComposer();
    }
    document.getElementById("stuRevChip").innerHTML = rev ? `revision <span class="mono">${rev.n}</span>${rev.n === d.latest ? "" : ` · latest <span class="mono">${d.latest}</span>`}` : "no revisions";
    for (const [k] of PANES) {
      const on = ST.pane === k;
      document.getElementById("stuTab-" + k).setAttribute("aria-selected", String(on));
      document.getElementById("stuPane-" + k).classList.toggle("on", on);
    }
    const wide = WIDEPANES.includes(ST.pane);
    box.classList.toggle("vwide", wide);
    for (const b of box.querySelectorAll(".vseg [data-v]")) b.setAttribute("aria-pressed", String(b.dataset.v === (wide ? ST.pane : "preview")));
    swap(document.getElementById("stuPane-revs"), revsHtml(d));
    swap(document.getElementById("stuData"), dataHtml());
    swap(document.getElementById("stuCheck"), checkHtml(rev));
    swap(document.getElementById("stuPane-looks"), looksHtml());
    swap(document.getElementById("stuPane-critic"), criticHtml());
    // never repainted under a finger that is typing (an email draft being changed, a reason being written)
    const typing = (el) => el && el.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (!typing(document.getElementById("stuPane-detail"))) swap(document.getElementById("stuPane-detail"), detailHtml());
    if (!typing(document.getElementById("stuPane-live"))) swap(document.getElementById("stuPane-live"), liveHtml());
    paintThread();
    swap(document.getElementById("stuTools"), toolsHtml());
    paintCards(); paintInsp();
    paintStage(rev);
    sendSpec();
  }
  // a sheet on a phone, a column on a desktop: hidden on a phone unless it is the open one
  function sheetState(el, name) {
    const open = ST.sheet === name && ST.pane === "preview";
    el.classList.toggle("open", open);
    el.hidden = !WIDE() && !open;
  }

  // ---- CHAT (S5, screen 2 and the "change this" box): you say or type what you want; the AI answers with change
  // cards (it never changes the site), or names the dashboard place for a fact. Every request is a job on the
  // Control Room, so it carries on through a reload or a phone that drops off. The composer is built once per site
  // and never repainted, so what you are typing or dictating is never lost to a refresh; only the thread is.
  const HAS_SPEECH = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg>';
  const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 6l6 6-6 6"/></svg>';
  const TRY = ["Make the headline shorter", "Make the whole site sound friendlier", "Less salesy everywhere"];
  const chatShell = () => `<section class="pane chat" id="stuPane-chat" role="tabpanel" aria-labelledby="stuTab-chat"><div class="scard">
      <h2 class="h" id="stuChatH">Talk to it</h2>
      <div class="thread" id="stuThread" aria-live="polite" aria-relevant="additions text"></div>
      <form class="askf nomic" id="stuAsk" novalidate>
        <div class="askrow"><textarea id="stuAskText" aria-label="What should change?" rows="2" maxlength="1000" placeholder="${HAS_SPEECH ? "Say or type what should change" : "Type what should change"}" aria-describedby="stuAskHelp"></textarea>
          <button type="button" class="mic" id="stuMic" aria-label="Talk instead of typing" title="Talk instead of typing">${MIC}</button>
          <button type="submit" class="send" id="stuSend" aria-label="Send">${SEND}</button></div>
        <p class="sdim small" id="stuAskHelp">${HAS_SPEECH ? "Tap the mic and talk, or type. " : ""}The AI only proposes change cards; nothing on the site changes until you apply one.</p>
        <p class="smsg" id="stuAskMsg" role="status" hidden></p></form></div></section>`;
  function wireComposer() {
    const mic = document.getElementById("stuMic"), box = document.getElementById("stuAskText");
    if (!mic) return;
    // the Control Room's own speech-to-text (ui.html dictate): it hides the mic where the browser has none
    if (typeof dictate === "function") dictate(mic, () => box); else mic.hidden = true;
    mic.addEventListener("click", () => { ST.via = "voice"; });
  }
  const partLabel = (t, spec = shownSpec()) => {
    if (!t?.section) return "";
    const sec = (spec?.pages?.[0]?.sections || []).find((x) => x.id === t.section);
    return t.field ? `${SECTION[sec?.type] || t.section} · ${FIELD[t.field] || t.field}` : SECTION[sec?.type] || t.section;
  };
  // the same words as studio.mjs waitPhrase: "about 22 hours (at 3:50 am Sat)"
  function waitPhrase(at, now = Date.now()) {
    const min = Math.max(1, Math.round((at - now) / 60000)), d = new Date(at), h = Math.round(min / 60);
    const long = min < 60 ? `about ${min} minute${min === 1 ? "" : "s"}` : `about ${h} hour${h === 1 ? "" : "s"}`;
    const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP])M$/i, (m, a) => ` ${a.toLowerCase()}m`);
    return `${long} (at ${clock}${d.toDateString() === new Date(now).toDateString() ? "" : ` ${d.toLocaleDateString("en-US", { weekday: "short" })}`})`;
  }
  const secs = (ms) => `${Math.max(1, Math.round(ms / 1000))} s`;
  function jobHtml(j, ai) {
    const spec = shownSpec();
    const me = `<li class="msg me"><p>${esc(j.request)}</p><span class="via">${j.via === "voice" ? "spoken" : "typed"}${j.target ? ` · about ${esc(partLabel(j.target, spec))}` : ""}</span></li>`;
    let body, acts = "", cls = "";
    const stop = `<button class="sbtn sm" data-act="askstop" data-id="${esc(j.id)}"${ST.busy["askstop" + j.id] ? " disabled" : ""}>Stop</button>`;
    const again = `<button class="sbtn sm" data-act="askagain" data-id="${esc(j.id)}"${ST.busy["askagain" + j.id] ? " disabled" : ""}>Ask again</button>`;
    if (j.status === "queued") {
      const ahead = (ST.detail.ai.jobs || []).filter((x) => x.status === "running" || (x.status === "queued" && x.created_at < j.created_at)).length;
      const held = (ST.detail.ai.jobs || []).map((x) => x.status === "waiting" && Date.parse(x.wait_until)).filter((x) => x > Date.now()).sort()[0];
      body = `<p class="run">${held ? `Waiting in line: Claude is out of its usage limit. Asked by itself in ${esc(waitPhrase(held))}.` : ai.running && ai.running !== j.id ? "Waiting its turn: the AI is answering another request first." : ahead ? "Waiting its turn." : "Starting…"}</p>${j.note ? `<p class="sdim small">${esc(j.note)}</p>` : ""}`; acts = stop; cls = "wait";
    } else if (j.status === "running") {
      const s = j.started_at ? Math.max(0, Math.round((Date.now() - Date.parse(j.started_at)) / 1000)) : 0;
      body = `<p class="run"><i class="dot run" aria-hidden="true"></i>Working on it${s >= 3 ? ` · ${s} s` : "…"}</p>${j.note ? `<p class="sdim small">${esc(j.note)}</p>` : ""}`; acts = stop; cls = "wait";
    } else if (j.status === "waiting") {
      body = `<p class="warnline">${j.wait_until ? `Claude is out of its usage limit. This waits and asks again by itself in ${esc(waitPhrase(Date.parse(j.wait_until)))}.` : esc(j.said || "Claude is out of its usage limit. This waits and asks again by itself.")}</p>`; acts = stop; cls = "need";
    } else if (j.status === "cancelled") {
      body = `<p class="sdim">Stopped. Nothing was made from it.</p>`; acts = again;
    } else if (j.status === "failed") {
      body = `<p class="badline">${esc(j.said || "The AI could not answer.")}</p>`; acts = again; cls = "bad";
    } else {
      const made = (j.cards || []).map((k) => ST.detail.cards.find((c) => c.id === k)).filter(Boolean);
      body = `${j.said ? `<p>${esc(j.said)}</p>` : ""}
        ${made.length ? `<ul class="made">${made.map((c) => `<li><button class="mrow" data-act="seecard" data-id="${c.id}"><span class="mono">card ${c.id}</span><span>${esc(partName(spec, c.patch?.section, c.patch?.field))}</span><span class="mto">“${esc(c.patch?.to || "")}”</span><span class="mst ${esc(c.status)}">${esc({ proposed: "ready to apply", applied: `applied in revision ${c.result}`, binned: "binned", stale: "out of date", conflict: "changed since" }[c.status] || c.status)}</span></button></li>`).join("")}</ul>` : ""}
        ${(j.dashboard || []).map((d) => `<div class="bnote" role="note">${IC.link}<div><p><b>Change this in the dashboard:</b> Business › ${esc(d.place)} <span class="dwhat">(${esc(d.what.replace(/^The /, "the ").replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase()))})</span></p></div></div>`).join("")}
        ${(j.refused || []).length ? `<div class="refused"><p><b>Not made into ${j.refused.length === 1 ? "a card" : "cards"}:</b></p><ul>${j.refused.map((r) => `<li><span class="mono">${esc(partName(spec, r.section, r.field))}</span> “${esc(r.to)}”<span class="rwhy">${esc(r.said)}</span></li>`).join("")}</ul></div>` : ""}`;
      if (j.kind !== "route" && !made.length && !(j.dashboard || []).length) acts = again;
    }
    const took = j.status === "done" && j.ms ? `<span class="via">${j.kind === "route" ? "" : `answered in ${secs(j.ms)}`}</span>` : "";
    return me + `<li class="msg bot ${cls}"><span class="who">${j.kind === "route" ? "Studio" : "AI"}</span>${body}${acts ? `<div class="acts">${acts}</div>` : ""}${took}</li>`;
  }
  function paintThread() {
    const el = document.getElementById("stuThread"); if (!el) return;
    const ai = ST.detail.ai || { jobs: [] }, jobs = ai.jobs || [];
    const html = jobs.length ? `<ol class="msgs">${jobs.map((j) => jobHtml(j, ai)).join("")}</ol>`
      : `<div class="hello"><p>Ask for a change in your own words. The answer comes as change cards you apply, preview or bin. Prices, hours, photos and reviews are changed in the dashboard, and the Studio says where.</p>
        <p class="sdim small">To start, try:</p><div class="tries">${TRY.map((t) => `<button class="sbtn sm" data-act="try" data-text="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>`;
    const key = jobs.map((j) => j.id + j.status).join();
    swap(el, html);
    if (ST.threadKey !== key) {
      // the newest message is new, or its answer just arrived (not on the first paint of the pane)
      const last = jobs.at(-1), grew = ST.threadKey != null && !!last && !ST.threadKey.endsWith(last.id + last.status); ST.threadKey = key;
      if (WIDE()) el.scrollTop = el.scrollHeight;
      // on a phone the page scrolls: a new message is brought into view above the pinned composer
      else if (grew && ST.pane === "chat") el.querySelector(".msgs > li:last-child")?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    const send = document.getElementById("stuSend"); if (send) send.disabled = !!ST.busy.ask;
  }
  async function sendAsk(text, { target = null, via = "typed", key = "ask" } = {}) {
    if (ST.busy[key]) return null;
    ST.busy[key] = true; paint();
    let r;
    try { r = await post("/api/studio/ask", { site: ST.site, text, via, ...(target ? { target } : {}) }); }
    catch (e) { r = { ok: false, said: "Could not reach the Control Room: " + e.message }; }
    ST.busy[key] = false;
    await load(); tick();
    return r;
  }

  // ---- the editor's tool row: Browse / Select, the words list, the cards
  function toolsHtml() {
    const d = ST.detail, open = d.cards.filter((c) => c.status === "proposed").length;
    if (!ST.rev) return "";
    if (ST.previewCard) return `<div class="note warn" role="status"><span><b>Showing card ${ST.previewCard}, not saved.</b> The site is still revision ${latest()}.</span>
      <button class="sbtn sm" data-act="unpreview">Stop showing it</button></div>`;
    if (!onLatest()) return `<div class="note" role="status"><span><b>Revision ${ST.rev} is an older one.</b> Changes are made on the latest, revision ${latest()}.</span>
      <span class="row tight"><button class="sbtn sm" data-act="rev" data-n="${latest()}">Show revision ${latest()}</button>
      <button class="sbtn sm" data-act="undo" data-n="${ST.rev}"${ST.busy.undo ? " disabled" : ""}>${IC.undo}${ST.busy.undo ? "Going back…" : "Go back to this one"}</button></span>${msg("undo")}</div>`;
    return `<div class="tools"><div class="modes" role="group" aria-label="What a tap on the phone does">
        ${[["browse", "Browse"], ["select", "Select"]].map(([m, l]) => `<button data-act="mode" data-m="${m}" aria-pressed="${ST.mode === m}">${l}</button>`).join("")}</div>
      <button class="sbtn sm narrow" data-act="words" aria-expanded="${ST.sheet === "insp" && !ST.pick}">Words</button>
      <button class="sbtn sm narrow" data-act="cards" aria-expanded="${ST.sheet === "cards"}">Cards <span class="mono">${open}</span></button></div>
      ${aiLine()}<p class="sdim small tip">${!LOCAL || !ST.ov.preview.running ? "The phone preview is off, so there is nothing to tap. Words still lists every piece of the site's wording."
        : ST.mode === "select" ? "Tap any part of the phone to change it. Prices, hours, photos and reviews come from the dashboard." : "The site works as a customer's would. Switch to Select to change a part."}</p>`;
  }

  // while the AI works on this site, the editor says so (its answer lands in Cards and in the chat)
  function aiLine() {
    const jobs = ST.detail.ai?.jobs || [], live = jobs.filter((j) => j.status === "running" || j.status === "queued"), wait = jobs.find((j) => j.status === "waiting");
    // while a request waits on Claude's usage nothing else is sent, so the wait is what to say
    if (wait && Date.parse(wait.wait_until) > Date.now()) return `<p class="ailine warn" role="status"><i class="dot warn" aria-hidden="true"></i><span>Claude is out of its usage limit. ${live.length ? `${live.length + 1} requests wait` : "A request waits"} and ${live.length ? "are" : "is"} asked again by itself in ${esc(waitPhrase(Date.parse(wait.wait_until)))}.</span></p>`;
    if (live.length) return `<p class="ailine" role="status"><i class="dot run" aria-hidden="true"></i><span>The AI is working on ${live.length === 1 ? `“${esc(live[0].request.length > 60 ? live[0].request.slice(0, 58) + "…" : live[0].request)}”` : `${live.length} requests`}. Its cards appear under Cards.</span></p>`;
    if (wait) return `<p class="ailine warn" role="status"><i class="dot warn" aria-hidden="true"></i><span>${esc(wait.said)}</span></p>`;
    return "";
  }
  // ---- change cards
  const partName = (spec, sid, field) => {
    const sec = (spec?.pages?.[0]?.sections || []).find((x) => x.id === sid);
    return `${SECTION[sec?.type] || sid} · ${FIELD[field] || field}`;
  };
  function cardHtml(c) {
    const spec = shownSpec(), L = latest(), busy = ST.busy["apply" + c.id];
    if (c.patch?.op === "comment") return commentCardHtml(c);
    const what = c.patch?.op === "revert" ? `Go back to revision ${c.patch.to}` : c.patch?.op === "look" ? `Use look ${c.patch.letter} (${c.patch.family})` : partName(spec, c.target?.section, c.target?.field);
    const ba = c.patch?.op === "copy" ? `<div class="ba"><span>${c.patch.from ? esc(c.patch.from) : "<i>nothing</i>"}</span>${IC.arrow}<span class="to">${c.patch.to ? esc(c.patch.to) : "<i>removed</i>"}</span></div>` : "";
    const src = ({ "detailer-ai": "From the detailer’s comment, through the AI", undo: "Go back", chat: "From your chat", tap: "From “change this”", look: "From the looks" }[c.source] || "Typed by you") + (c.via === "voice" ? " · spoken" : "");
    let foot;
    if (c.status === "applied") foot = `<p class="done">${IC.ok}<span>Applied in revision ${c.result}.${c.quick?.ms ? ` Quick check passed in ${Math.max(1, Math.round(c.quick.ms / 1000))}\u00a0s.` : ""}</span></p>`;
    else if (c.status === "binned") foot = `<p class="sdim small">${c.redone_as ? `Redone as card ${c.redone_as}.` : c.source === "undo" ? `Not made: ${esc(c.why || "it did not pass")}` : c.why ? `Done already. ${esc(c.why)}` : "Binned. Nothing changed on the site."}</p>`;
    else if (c.status === "stale" || c.status === "conflict") {
      const now = c.now ?? "";
      foot = `<p class="out ${c.status}">${c.status === "stale" ? `<b>Out of date.</b> Made on revision ${c.base}; the site is at revision ${L} now. This part has not changed since, so it can be made again there.`
        : `<b>Changed since.</b> Made on revision ${c.base}; in revision ${L} these words are now “${esc(now)}”. Making it again replaces them.`}</p>
        <div class="acts">${c.patch?.op === "copy" ? `<button class="sbtn sm" data-act="redo" data-id="${c.id}"${ST.busy["redo" + c.id] ? " disabled" : ""}>${ST.busy["redo" + c.id] ? "Making…" : `Make it again on revision ${L}`}</button>` : ""}
        <button class="sbtn ghost sm" data-act="bin" data-id="${c.id}">Bin</button></div>`;
    } else foot = `${c.quick && !c.quick.ok ? `<p class="out conflict" role="alert"><b>Not applied.</b> ${esc(c.quick.said || "The quick check did not pass.")}</p>` : ""}
      <div class="acts"><button class="sbtn pri sm" data-act="apply" data-id="${c.id}"${busy || ST.detail.applying ? " disabled" : ""}>${busy ? "Applying… quick check" : "Apply"}</button>
        <button class="sbtn sm" data-act="cardpreview" data-id="${c.id}" aria-pressed="${ST.previewCard === c.id}"${!LOCAL || !ST.ov.preview.running ? " disabled" : ""}>Preview</button>
        <button class="sbtn ghost sm" data-act="bin" data-id="${c.id}"${busy ? " disabled" : ""}>Bin</button></div>`;
    return `<li class="ccard ${esc(c.status)}" id="stuCard-${c.id}"><div class="src"><span class="who">${src}</span><span class="mono">card ${c.id} · on revision ${c.base}</span></div>
      <p class="what">${esc(what)}</p>${ba}${c.why ? `<p class="why">${esc(c.why)}</p>` : ""}${c.patch?.op === "copy" ? '<p class="scope">This part only</p>' : ""}${foot}</li>`;
  }
  function paintCards() {
    const el = document.getElementById("stuCards"), cards = ST.detail.cards;
    if (el.contains(document.activeElement) && document.activeElement.id?.startsWith("stuWhy-")) return;   // a reason being written
    const open = cards.filter((c) => c.status === "proposed" || c.status === "stale" || c.status === "conflict");
    const shut = cards.filter((c) => !open.includes(c)).slice(0, 8);
    const ready = cards.filter((c) => c.status === "proposed" && c.base === latest() && c.patch?.op !== "comment");
    const parts = new Set(ready.map((c) => `${c.patch?.section}.${c.patch?.field}`));
    swap(el, `<div class="grab" aria-hidden="true"></div><div class="cardsHead"><h2 class="h" id="stuCardsH" tabindex="-1">Change cards <span class="n">${open.length} open</span></h2>
        ${ready.length > 1 && parts.size === ready.length ? `<button class="sbtn ghost sm" data-act="applyall"${ST.busy.applyall || ST.detail.applying ? " disabled" : ""}>${ST.busy.applyall ? "Applying…" : "Apply all"}</button>` : ""}
        <button class="sbtn ghost sm close" data-act="closesheet" aria-label="Close the change cards">${IC.x}</button></div>
      ${msg("cards")}
      ${cards.length ? `<ul class="clist">${open.concat(shut).map(cardHtml).join("")}</ul>` : `<p class="sdim small">No change cards yet. ${!LOCAL || !ST.ov?.preview?.running ? "Open Words, choose the wording you want to change, and make a card." : `${ST.mode === "select" ? "Tap" : "Switch to Select and tap"} the words you want to change on the phone, or choose them in Words, and make a card.`} Applying a card makes a new revision; the old one stays.</p>`}`);
    sheetState(el, "cards");
  }

  // ---- the part you picked
  function paintInsp() {
    const el = document.getElementById("stuInsp"), p = ST.pick, spec = shownSpec();
    const was = el.querySelector("#stuEditText"), hadFocus = was && document.activeElement === was;
    const wasAsk = el.querySelector("#stuAskPartText"), askFocus = wasAsk && document.activeElement === wasAsk;
    let html;
    if (!p || !spec) {
      // also the keyboard's way in: every piece of the site's own wording, by part
      const secs = (spec?.pages?.[0]?.sections || []).map((s) => [s, FIELD_ORDER.filter((f) => s.copy?.[f] !== undefined)]).filter(([, f]) => f.length);
      html = `<div class="grab" aria-hidden="true"></div><div class="ihead"><h2 class="h" tabindex="-1">The site's wording</h2><button class="sbtn ghost sm close" data-act="closesheet" aria-label="Close">${IC.x}</button></div>
        <p class="sdim small">${canSelect() ? `${LOCAL && ST.ov?.preview?.running ? "Tap any part of the phone in Select, or pick the words here." : "Pick the words here (the phone preview is off)."} Prices, hours, photos and reviews are not here: they come from the dashboard.` : !onLatest() ? `Changes are made on the latest revision, ${latest()}.` : "Stop showing the card to change the words."}</p>
        ${canSelect() ? secs.map(([s, fs]) => `<div class="wgroup"><p class="wsec">${esc(SECTION[s.type] || s.id)}</p>${fs.map((f) => `<button class="wrow" data-act="field" data-n="${esc(s.id)}" data-field="${f}"><b>${esc(FIELD[f])}</b><span>${esc(s.copy[f])}</span></button>`).join("")}</div>`).join("") : ""}`;
    } else {
      const sec = (spec.pages?.[0]?.sections || []).find((x) => x.id === p.section);
      const sname = SECTION[sec?.type] || p.section;
      const field = p.from ? null : p.part && Object.hasOwn(FIELD, p.part) && sec?.copy?.[p.part] !== undefined ? p.part : null;
      const head = (title, path) => `<div class="grab" aria-hidden="true"></div><div class="ihead"><div><p class="path mono">${esc(path)}</p><h2 class="h ttl" tabindex="-1">${esc(title)}</h2></div>
        <button class="sbtn ghost sm close" data-act="closesheet" aria-label="Close">${IC.x}</button></div>`;
      if (p.from) {
        const [title, what, place] = bound(p.from, p.name), biz = ST.detail.site.name;
        html = head(title, [sname, p.name].filter(Boolean).join(" · ")) + `<p><span class="wire">${IC.link}Connected to the dashboard</span></p>
          <div class="bnote" role="note">${IC.link}<div><p><b>This comes from the dashboard.</b> ${esc(what)} is set in ${esc(biz)}'s dashboard, so it cannot be typed here. Change it there and the site shows it the next time it is opened.</p>
          <p class="where">Where: <b>Business › ${esc(place)}</b></p></div></div>
          <p class="sdim small">${ST.detail.site.kind === "example" ? "This example's dashboard is a test copy on this laptop, so there is no page to open. On a real detailer's site, this opens that page of their dashboard." : "Opening the dashboard from here comes in a later step."}</p>`;
      } else if (field) {
        html = head(FIELD[field], `${sname} · ${FIELD[field]}`) + `<p><span class="wire off">Site wording. Not from the dashboard.</span></p>
          <form class="editf" id="stuEdit" data-section="${esc(p.section)}" data-field="${field}" novalidate>
            <label for="stuEditText">New words</label>
            <textarea id="stuEditText" rows="3" maxlength="400" aria-describedby="${ST.editErr ? "stuEditErr " : ""}stuEditHelp"${ST.editErr ? ' aria-invalid="true"' : ""}></textarea>
            ${ST.editErr ? `<p class="smsg bad" id="stuEditErr" role="alert">${esc(ST.editErr)}</p>` : ""}
            <div class="row"><p class="sdim small" id="stuEditHelp">Words only: prices and numbers come from the dashboard.</p>
              <button class="sbtn pri" type="submit"${ST.busy.card ? " disabled" : ""}>${ST.busy.card ? "Checking…" : "Make a card"}</button></div></form>${askPartHtml(p.section, field)}`;
      } else {
        const fs = FIELD_ORDER.filter((f) => sec?.copy?.[f] !== undefined);
        html = head(sname, p.part ? `${sname} · ${p.part.replace(/_/g, " ")}` : sname) + `<p class="sdim small">${fs.length ? "This part has no words of its own. The words of this section:" : "This section has no words of its own to change."}</p>
          ${fs.map((f) => `<button class="wrow" data-act="field" data-n="${esc(p.section)}" data-field="${f}"><b>${esc(FIELD[f])}</b><span>${esc(sec.copy[f])}</span></button>`).join("")}${fs.length ? askPartHtml(p.section, null) : ""}`;
      }
    }
    swap(el, html);
    const ta = el.querySelector("#stuEditText");
    if (ta) {
      if (ta !== was) ta.value = ST.draft ?? "";
      if (hadFocus && ta !== was) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }
    const ak = el.querySelector("#stuAskPartText");
    if (ak && ak !== wasAsk) { ak.value = ST.askDraft ?? ""; if (askFocus) { ak.focus({ preventScroll: true }); ak.setSelectionRange(ak.value.length, ak.value.length); } }
    sheetState(el, "insp");
  }
  // "Change this": the same request as the chat, about the part you tapped. Quick chips send at once.
  const QUICK = ["Shorter", "Friendlier", "Plainer", "More direct"];
  function askPartHtml(section, field) {
    const busy = ST.busy.askpart;
    return `<form class="editf askpart" id="stuAskPart" data-section="${esc(section)}" data-field="${esc(field || "")}" novalidate>
      <label for="stuAskPartText">Or ask the AI to change ${field ? "it" : "this section's words"}</label>
      ${partJobHtml()}${msg("askpart")}
      <div class="quick" role="group" aria-label="Quick changes">${QUICK.map((q) => `<button type="button" class="sbtn sm" data-act="quick" data-text="${q}"${busy ? " disabled" : ""}>${q}</button>`).join("")}</div>
      <textarea id="stuAskPartText" rows="2" maxlength="1000" placeholder="Change this. Say what you want."></textarea>
      <div class="row"><p class="sdim small">The answer comes as a change card.</p><button class="sbtn" type="submit"${busy ? " disabled" : ""}>${busy ? "Asking…" : "Ask the AI"}</button></div></form>`;
  }
  // what became of the last request asked from this sheet. No running clock here: the sheet holds text boxes and a
  // dictation, so it repaints only when the answer changes.
  function partJobHtml() {
    const j = ST.partJob && (ST.detail.ai?.jobs || []).find((x) => x.id === ST.partJob);
    if (!j) return "";
    const q = `“${esc(j.request)}”`;
    if (j.status === "queued" || j.status === "running") return `<p class="pjob run" role="status"><i class="dot run" aria-hidden="true"></i><span>Asked: ${q}. The AI is working on it; you can carry on.</span></p>`;
    if (j.status === "waiting") return `<p class="pjob warn" role="status">Claude is out of its usage limit. This waits and asks again by itself${j.wait_until ? ` in ${esc(waitPhrase(Date.parse(j.wait_until)))}` : ""}.</p>`;
    if (j.status === "failed" || j.status === "cancelled") return `<div class="pjob bad" role="status"><p>${j.status === "cancelled" ? "Stopped. Nothing was made from it." : esc(j.said)}</p><button type="button" class="sbtn sm" data-act="askagain" data-id="${esc(j.id)}">Ask again</button></div>`;
    const made = (j.cards || []).map((k) => ST.detail.cards.find((c) => c.id === k)).filter(Boolean);
    const why = (j.refused || [])[0]?.said;
    return `<div class="pjob ${made.length ? "ok" : ""}" role="status"><p>${made.length ? `${IC.ok}<span>${made.length === 1 ? `Card ${made[0].id} is ready` : `Cards ${made.map((c) => c.id).join(", ")} are ready`}: ${esc(j.said || "")}</span>` : `<span>${esc(j.said || "No card was made.")}${why ? ` ${esc(why)}` : ""}</span>`}</p>
      ${made.length ? `<button type="button" class="sbtn sm" data-act="seecard" data-id="${made[0].id}">See the card</button>` : `<button type="button" class="sbtn sm" data-act="askagain" data-id="${esc(j.id)}">Ask again</button>`}</div>`;
  }
  function openPick(p, { focus = true } = {}) {
    const spec = shownSpec();
    const field = !p.from && p.part && Object.hasOwn(FIELD, p.part) ? p.part : null;
    ST.pick = p; ST.editErr = null; ST.askDraft = null; ST.partJob = null; delete ST.msg.askpart;
    ST.draft = field ? ((spec?.pages?.[0]?.sections || []).find((x) => x.id === p.section)?.copy?.[field] ?? "") : null;
    ST.sheet = "insp";
    paint();
    const el = document.getElementById("stuInsp");
    el.scrollTop = 0;   // R7-P0-4: a new pick starts at its heading and Close (it kept the word list's scroll, 68 px at 390)
    const ta = el.querySelector("#stuEditText");
    if (focus) {
      if (ta && WIDE()) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
      else el.querySelector(".ttl, h2")?.focus({ preventScroll: true });
    }
    // on a phone the sheet covers the lower part: keep the phone frame's top in view (the picker scrolls the part up)
    if (!WIDE()) document.getElementById("stuStage")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const [title] = p.from ? bound(p.from, p.name) : [FIELD[field] || SECTION[(spec?.pages?.[0]?.sections || []).find((x) => x.id === p.section)?.type] || p.section];
    toFrame({ type: "studio-tag", text: title });
  }
  function closeSheet() {
    const was = ST.sheet;
    ST.sheet = null;
    if (was === "insp") { ST.pick = null; ST.draft = null; ST.editErr = null; toFrame({ type: "studio-clear" }); }
    paint();
    if (!WIDE()) root().querySelector(`[data-act="${was === "cards" ? "cards" : "words"}"]`)?.focus({ preventScroll: true });
  }

  // "Card 1 · First screen · Headline" rather than "Card 1", while the card is on hand
  const revNote = (r) => {
    const cs = (r.cards || []).map((k) => ST.detail.cards.find((c) => c.id === k)).filter((c) => c?.patch?.op === "copy");
    return cs.length && cs.length === r.cards.length ? cs.map((c) => `Card ${c.id} · ${partName(shownSpec(), c.patch.section, c.patch.field)}`).join("; ") : r.note || "";
  };
  function revsHtml(d) {
    const L = d.latest;
    return `<div class="scard"><h2 class="h">Revisions <span class="n">${d.revisions.length}</span></h2>
      <p class="sdim small">A revision is never changed. Each change makes a new one, and going back to an old one makes a new one too, so nothing is lost.</p>
      <ul class="revs">${d.revisions.map((r) => `<li class="${r.n === ST.rev ? "on" : ""}"><button class="rev${r.n === ST.rev ? " on" : ""}" data-act="rev" data-n="${r.n}" aria-pressed="${r.n === ST.rev}">
        <span class="rn">Revision <span class="mono">${r.n}</span>${r.n === L ? ' <span class="chip ok">The site now</span>' : ""}</span><span class="rd">${esc(when(r.created_at))} · ${esc(revNote(r))}</span>
        <span class="rc">${r.quick ? `<span class="wire">${IC.ok}Quick check${r.quick.ms ? ` ${Math.max(1, Math.round(r.quick.ms / 1000))} s` : ""}</span> ` : ""}${r.check ? (r.check.ok ? `<span class="wire">${IC.ok}Connected</span>` : `<span class="wire bad">${IC.bad}Check failed</span>`) : '<span class="wire off">Connection not checked</span>'}</span></button>
        ${r.n !== L ? `<button class="sbtn ghost sm goback" data-act="undo" data-n="${r.n}"${ST.busy.undo ? " disabled" : ""}>${IC.undo}${ST.busy.undo === r.n ? "Going back…" : `Go back to ${r.n}`}</button>` : ""}</li>`).join("")}</ul>${msg("undo")}
      ${d.applied ? "" : `<button class="sbtn wide" data-act="newrev"${ST.busy.newrev ? " disabled" : ""}>${ST.busy.newrev ? "Loading…" : "Load the example file as a new revision"}</button>
      <p class="sdim small">Only until a change is applied: the file does not have your changes.</p>`}${msg("newrev")}</div>`;
  }
  const redWords = (lines = []) => {
    const red = lines.filter((l) => !l.pass && !l.skipped).length, skip = lines.filter((l) => l.skipped).length;
    return `${red} of ${lines.length} red${skip ? `, ${skip} not tried` : ""}.`;
  };
  function checkHtml(rev) {
    if (!rev) return '<div class="scard pad"><p class="sdim">This site has no revisions yet.</p></div>';
    const run = ST.ov.check, mine = run && run.site === ST.site && run.rev === rev.n, other = run && !mine;
    const c = mine ? { ...run, running: true } : ST.shown && ST.shown.rev === rev.n ? ST.shown : null;
    const got = new Map((c?.lines || []).map((l) => [l.id, l]));
    let next = !!c?.running;
    const tick = (l) => l.skipped ? `<li class="cl skip"><i aria-hidden="true"></i><span>${esc(l.says)}</span></li>`
      : `<li class="cl ${l.pass ? "ok" : "bad"}"><i>${l.pass ? IC.ok : IC.bad}</i><span>${esc(l.says)}${l.detail ? `<span class="det">${esc(l.detail)}</span>` : ""}</span></li>`;
    const PLAN = plan();
    const rows = PLAN.map(([id, says]) => {
      const l = got.get(id);
      if (l) return tick(l);
      const cls = next ? "run" : c && !c.running ? "skip" : "";
      next = false;
      return `<li class="cl ${cls}"><i aria-hidden="true"></i><span>${esc(says)}${cls === "skip" ? '<span class="det">Not reached</span>' : ""}</span></li>`;
    }).join("") + [...got.values()].filter((l) => !PLAN.some(([id]) => id === l.id)).map(tick).join("");
    const total = PLAN.length, done = c?.lines?.length || 0;
    const result = !c ? `<p class="result">Not checked yet. The check takes under a minute.</p>`
      : c.running ? `<p class="result run" role="status">Checking… ${done} of ${total}</p>`
      : c.ok ? `<p class="result ok" role="status">${IC.ok}<span><b>Connected.</b> ${c.passed} of ${(c.lines || []).length || c.passed} green. Checked ${esc(ago(c.finished_at))}.</span></p>`
      : `<p class="result bad" role="status">${IC.bad}<span><b>Not connected.</b> ${c.error ? esc(c.error) : redWords(c.lines)} Checked ${esc(ago(c.finished_at))}.</span></p>`;
    const older = !c && ST.detail.checks[0] ? `<p class="sdim small">The last check was on revision ${ST.detail.checks[0].rev}.</p>` : "";
    return `<div class="scard"><h2 class="h">Connection check <span class="n">revision ${rev.n}</span></h2>
      <p class="sdim small">Runs on a private copy of the example dashboard, changes it, and watches the site follow. The real dashboard is never touched.</p>
      <ol class="check" aria-live="polite">${rows}</ol>${result}${older}
      <button class="sbtn pri wide" data-act="check"${c?.running || other || ST.busy.check || !ST.ov.preview.platformOk ? " disabled" : ""}>${c?.running ? `Checking… ${done} of ${total}` : c ? "Run it again" : "Run connection check"}</button>
      ${other ? `<p class="sdim small">Another check is running (${esc(run.site)}, revision ${run.rev}). One at a time.</p>` : ""}${msg("check")}</div>`;
  }
  function paintStage(rev) {
    const p = ST.ov.preview, host = document.getElementById("stuStage");
    const key = `${LOCAL}|${p.running}|${p.starting || !!ST.busy.start}|${p.stopping || !!ST.busy.stop}|${p.error || ""}|${ST.site}|${!!rev}|${p.port}|${!!ST.msg.server}`;
    if (ST.stageKey === key) return;
    ST.stageKey = key; ST.frameReady = false; ST.sentKey = null;
    let inner;
    if (!rev) inner = '<p class="sdim">No revision to show.</p>';
    else if (!LOCAL) inner = `<div class="phone off"><div class="say"><b>The preview runs on the laptop</b><p>Open the Control Room on the laptop to see this revision in the phone frame. On a phone over the tunnel it cannot be shown yet.</p></div></div>`;
    else if (!p.running || p.stopping || ST.busy.stop) {
      const going = p.starting || ST.busy.start, leaving = p.stopping || ST.busy.stop;
      inner = `<div class="phone off"><div class="say"><b>${going ? "Turning on the phone preview…" : leaving ? "Turning off the phone preview…" : "The phone preview is off"}</b>
        <p>${going ? "Both servers are starting, hidden on this laptop. This takes a few seconds." : leaving ? "Waiting for both servers to stop." : "It draws the site on this laptop with test data. Nothing goes to the real dashboard."}</p>
        ${p.error && !going ? `<p class="smsg bad" role="alert">${esc(p.error)}</p>` : ""}
        ${leaving ? "" : `<button class="sbtn pri" data-act="start"${going || !p.platformOk ? " disabled" : ""}>${going ? "Turning on…" : ON}</button>`}${msg("server")}</div></div>`;
    }
    else inner = `<div class="phone"><div class="scr"><iframe id="stuFrame" title="${esc(ST.detail.site.name)}, as a phone shows it" src="${esc(p.url)}" width="390" height="844" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
      <div class="say frmsg" id="stuFrameMsg" role="status" hidden></div></div></div>`;
    host.innerHTML = `<div class="scard stage">${inner}</div>`;
    fit();
  }
  // the 390-wide site, scaled into whatever width the frame has
  function fit() {
    const scr = document.querySelector("#viewStudio .phone .scr"); if (!scr || !scr.clientWidth) return;   // a hidden pane is fitted when shown
    const s = Math.min(1, scr.clientWidth / 390);
    // from 1100 px the phone stays in view beside the columns, so it is as tall as the window allows (a shorter phone)
    let h = Math.round(844 * s);
    if (WIDE()) h = Math.min(h, Math.max(480, innerHeight - (parseFloat(getComputedStyle(document.body).getPropertyValue("--nxtop")) || 0) - 200));
    scr.style.setProperty("--s", String(s));
    scr.style.height = h + "px";
    const f = scr.querySelector("iframe"); if (f) f.style.height = Math.round(h / s) + "px";
  }
  addEventListener("resize", () => { fit(); if (ST.screen === "site" && ST.detail) { paintCards(); paintInsp(); } });

  // ---- talking to the phone frame. Only to the preview's own origin; only from it, and only for the revision shown.
  const frame = () => document.getElementById("stuFrame");
  const frameOrigin = () => { const f = frame(); try { return f ? new URL(f.src).origin : null; } catch { return null; } };
  const frameKey = () => (ST.previewCard ? `${ST.site}/${ST.rev}+card${ST.previewCard}` : `${ST.site}/${ST.rev}`);
  function toFrame(m) { const f = frame(), o = frameOrigin(); if (f && o && ST.frameReady) f.contentWindow.postMessage(m, o); }
  async function sendSpec() {
    if (!ST.frameReady || !ST.rev) return;
    const k = frameKey();
    if (ST.sentKey === k) return toFrame({ type: "studio-mode", mode: canSelect() ? ST.mode : "browse" });
    ST.sentKey = k;
    try {
      const spec = ST.previewCard
        ? (ST.specs[k] ||= (await get(`/api/studio/card/spec?site=${encodeURIComponent(ST.site)}&id=${ST.previewCard}`)).spec)
        : await specFor(ST.rev);
      if (ST.sentKey !== k || !spec) return;
      const f = frame(), o = frameOrigin(); if (!f || !o) return;
      f.title = `${ST.detail.site.name}, ${ST.previewCard ? `card ${ST.previewCard} shown on revision ${ST.rev}` : `revision ${ST.rev}`}, as a phone shows it`;
      f.contentWindow.postMessage({ type: "studio-spec", spec, revision: k }, o);
      f.contentWindow.postMessage({ type: "studio-mode", mode: canSelect() ? ST.mode : "browse" }, o);
    } catch { ST.sentKey = null; }
  }
  addEventListener("message", (e) => {
    const f = frame();
    if (!f || e.source !== f.contentWindow || e.origin !== frameOrigin()) return;   // any other window or origin: ignored
    const d = e.data;
    if (d?.type === "studio-state") return frameSaid(d.state);
    if (d?.type === "studio-ready") { ST.frameReady = true; ST.sentKey = null; sendSpec(); return; }
    if (d?.type === "studio-pick") {
      // a pick made on another revision (the frame was still drawing the last one) or while not in Select: ignored
      if (d.revision !== frameKey() || !canSelect() || ST.mode !== "select" || typeof d.section !== "string") return;
      openPick({ section: d.section, part: typeof d.part === "string" ? d.part : null, from: typeof d.from === "string" ? d.from : null,
        item: d.item ?? null, name: typeof d.name === "string" ? d.name : null, text: String(d.text || "") });
    }
  });

  function frameSaid(state) {
    const box = document.getElementById("stuFrameMsg"); if (!box) return;
    const bad = state === "refused" || state === "not_found";
    box.hidden = !bad;
    frame()?.classList.toggle("dim", bad);
    if (!bad) return;
    const c = ST.shown && ST.shown.rev === ST.rev ? ST.shown : null;
    const why = (c?.lines || []).filter((l) => !l.pass && !l.skipped).map((l) => l.detail).filter(Boolean)[0];
    box.innerHTML = `<b>This revision cannot be drawn</b><p>${why ? esc(why) : state === "not_found" ? "It names a business the test dashboard does not have." : "Something in it does not fit the dashboard. Run the connection check to see what."}</p>`;
  }
  // ---- S6 LIVE DATA (screen 5): what the detailer's dashboard holds, and where the site shows each thing
  const DSTATE = { connected: ["ok", "Connected"], unused: ["", "Not used on the site"], missing: ["warn", "Missing"], none: ["", "None set"] };
  function dataHtml() {
    const d = ST.data?.key === `${ST.site}/${latest()}` ? ST.data.r : null;
    const head = `<h2 class="h">Live data <span class="n">${d?.ok ? `revision ${d.rev}` : ""}</span></h2>
      <p class="sdim small">What ${esc(ST.detail.site.name)}'s dashboard holds right now, and which part of the site shows it. The site keeps no copy of any of it.${d?.example ? " This example reads a test copy of the dashboard on this laptop." : ""}</p>`;
    if (!d) return `<div class="scard">${head}<p class="sdim" aria-busy="true">Reading the dashboard…</p></div>`;
    if (!d.ok) return `<div class="scard">${head}<p class="smsg bad" role="alert">${esc(d.said)}</p></div>`;
    const missing = d.rows.filter((r) => r.status === "missing").length;
    return `<div class="scard">${head}${missing ? `<p class="dgap" role="status"><i class="dot warn" aria-hidden="true"></i>${missing} thing${missing === 1 ? "" : "s"} missing from the dashboard. The site leaves ${missing === 1 ? "that part" : "those parts"} out until ${missing === 1 ? "it is" : "they are"} added.</p>` : ""}
      <ul class="drows">${d.rows.map((r) => { const [cls, word] = DSTATE[r.status]; const more = r.items.length - 4;
        return `<li class="drow ${r.status}"><div class="dtop"><b>${esc(r.what)}</b><span class="dst ${cls}">${r.status === "connected" ? IC.link : ""}${word}</span></div>
        ${r.items.length ? `<p class="ditems">${r.items.slice(0, 4).map(esc).join("<br>")}${more > 0 ? `<br><span class="sdim">and ${more} more</span>` : ""}</p>` : ""}
        ${r.where.length ? `<p class="sdim small">Shows in: ${esc(r.where.join(", "))}</p>` : ""}
        ${r.todo ? `<p class="dtodo">To do for the detailer: ${esc(r.todo)}</p>` : ""}
        <p class="sdim small">Changed in Business › ${esc(r.place)}</p></li>`; }).join("")}</ul></div>`;
  }

  // ---- S6 THREE LOOKS (screen 3). One at a time on a phone (A / B / C), three side by side on a desktop.
  const lkView = () => ST.detail?.looks || null;
  const shotUrl = (lk, L, x, w) => `/api/studio/looks/shot?site=${encodeURIComponent(ST.site)}&set=${encodeURIComponent(lk.id)}&letter=${L}&v=${x.v}&w=${w}`;
  const makerName = (m) => { const [who, model] = String(m || "").split(":"); return who === "chatgpt" ? `ChatGPT ${model === "gpt-6.1-sol" ? "Sol" : model === "gpt-5.6-terra" ? "Terra" : model}` : who === "claude" ? `Claude ${model ? model[0].toUpperCase() + model.slice(1) : ""}`.trim() : m; };
  const since = (iso) => { const s = iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)) : 0; return s >= 3 ? ` · ${s} s` : ""; };
  function lookJobLine(l) {
    const j = l.job; if (!j) return "";
    if (j.status === "waiting") return `<p class="lkjob warn" role="status"><i class="dot warn" aria-hidden="true"></i><span>${esc(j.said || "Waiting for the AI's usage to come back.")}${j.wait_until ? ` (${esc(waitPhrase(Date.parse(j.wait_until)))})` : ""}</span></p>`;
    const as = l.versions && l.family !== l.last?.family && lkView()?.families?.[l.family] ? ` as ${esc(lkView().families[l.family])}` : "";
    const what = j.kind === "critic" ? `The critic is looking at version ${l.last?.v ?? ""}` : j.status === "queued" ? (l.versions ? `Waiting to be remade${as}` : "Waiting its turn") : j.said && /gates/.test(j.said) ? "Checking it against the gates at three widths" : `Writing ${l.versions ? `a new version${as}` : "the words and the order"}`;
    return `<p class="lkjob" role="status"><i class="dot run" aria-hidden="true"></i><span>${what}${j.status === "running" ? since(j.started_at) : ""}…</span></p>`;
  }
  function lookCard(lk, l) {
    const x = l.shown, last = l.last, fam = (x || last)?.family_name || lk.families?.[l.family] || l.family, on = (ST.lookAt || "A") === l.letter;
    const busy = (k) => ST.busy[k + l.letter];
    const other = Object.keys(lk.families || {}).find((k) => !lk.letters.some((m) => m.family === k));
    const gates = x?.gates?.filter((g) => g.pass !== null) || [];
    const sum = x?.critic?.summary;
    const chip = x ? `<span class="chip ok">${IC.ok}Shown</span>` : l.job ? `<span class="chip">Being made</span>` : last ? `<span class="chip warn">Hidden</span>` : `<span class="chip">Not made</span>`;
    const body = x
      ? `<div class="lkphone"><div class="lkscr" tabindex="0" role="img" aria-label="Look ${l.letter}, ${esc(fam)}, as a phone shows it (scroll to see the whole page)"><img src="${esc(shotUrl(lk, l.letter, x, 390))}" alt="" width="390" loading="lazy"></div></div>`
      : l.blocked ? `<div class="lkhid"><p><b>Not shown.</b> Every version that passed the gates is too close to another look (the same first screen, type or section order).</p>${!l.job ? `<p class="sdim">Remake it, or try another family.</p>` : ""}</div>`
      : `<div class="lkhid"><p><b>${last ? "Not shown yet." : "Nothing to show yet."}</b> ${last?.said ? esc(last.said) : last ? "" : "It is being made."}</p>${last && !l.job ? `<p class="sdim small">A look is shown only when it passes every gate. Remake it, or try another family.</p>` : ""}</div>`;
    const newer = x && last && last.v !== x.v ? `<p class="sdim small">Showing version ${x.v}, the best so far. Version ${last.v}: ${esc(last.status === "shown" ? `scored ${last.critic?.summary?.score ?? "…"}` : last.said || last.status)}</p>` : "";
    return `<article class="lk${on ? " on" : ""}" id="stuLook-${l.letter}" aria-label="Look ${l.letter}: ${esc(fam)}">
      <header class="lkh"><span class="lt" aria-hidden="true">${l.letter}</span><div class="lkt"><h3 id="stuLookH-${l.letter}">${esc(fam)}</h3>
        <p class="sdim small">${x ? `${esc(makerName(x.maker))} · version ${x.v}` : last ? `${esc(makerName(last.maker))} · version ${last.v}` : "&nbsp;"}</p></div>${chip}</header>
      ${lookJobLine(l)}${body}${newer}
      ${x?.why?.length ? `<ul class="why">${x.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      ${x ? `<p class="lkg"><span class="wire">${IC.ok}${gates.filter((g) => g.pass).length} of ${gates.length} gates</span>
        ${sum ? `<span class="score ${sum.pass ? "ok" : "warn"}"><b class="mono">${sum.score}</b> from the critic</span>` : x.critic?.error ? `<span class="sdim small">No critique</span>` : `<span class="sdim small">Critic next</span>`}
        <button class="sbtn ghost sm" data-act="seecritic" data-l="${l.letter}">See the critic</button></p>
        <div class="acts"><button class="sbtn pri sm" data-act="lookuse" data-l="${l.letter}"${busy("lookuse") || ST.detail.applying ? " disabled" : ""}>${busy("lookuse") ? "Using it… quick check" : "Use this look"}</button>
          <span class="taste" role="group" aria-label="Your verdict on look ${l.letter}">${[["love", "Love it"], ["no", "No"]].map(([v, t]) => `<button class="sbtn sm tv ${v}" data-act="looktaste" data-l="${l.letter}" data-verdict="${v}" aria-pressed="${l.taste === v}">${t}</button>`).join("")}</span></div>` : ""}
      ${!l.job ? `<div class="acts more"><button class="sbtn ghost sm" data-act="lookremake" data-l="${l.letter}"${busy("lookremake") ? " disabled" : ""}>${IC.undo}${x?.critic?.summary?.fixes?.length ? "Remake with the critic's fixes" : "Remake it"}</button>
        ${other ? `<button class="sbtn ghost sm" data-act="lookfamily" data-l="${l.letter}" data-f="${esc(other)}"${busy("lookfamily") ? " disabled" : ""}>Try ${esc(lk.families[other])} instead</button>` : ""}</div>` : ""}
      ${msg("look" + l.letter)}</article>`;
  }
  function looksHtml() {
    const lk = lkView(), d = ST.detail, L = latest();
    const head = `<div class="lhead"><div class="t"><h2 class="mid">Three looks</h2>
      <p class="sdim small">Three directions made from the same live data, each in its own style family. Each is drawn at three widths and checked by the gates; a look that fails one stays hidden until it is fixed. Then ChatGPT critiques it from the screenshots alone.</p></div>
      ${lk?.working ? `<button class="sbtn" data-act="looksstop"${ST.busy.looksstop ? " disabled" : ""}>Stop making them</button>` : `<button class="sbtn ${lk ? "" : "pri"}" data-act="looksmake"${ST.busy.looksmake || !L ? " disabled" : ""}>${ST.busy.looksmake ? "Starting…" : lk ? `Make three new looks from revision ${L}` : "Make three looks"}</button>`}</div>${msg("looksmake")}${msg("looksstop")}`;
    if (!lk) return `${head}<div class="scard pad empty"><h3>No looks yet</h3><p>Make three looks of ${esc(d.site.name)} from revision ${L ?? "…"}. It takes a few minutes; you can carry on in the editor meanwhile. Who makes them and who critiques them is in Studio settings.</p></div>`;
    const sw = `<div class="lsw" role="group" aria-label="Which look">${lk.letters.map((l) => `<button class="sbtn sm" data-act="lookat" data-l="${l.letter}" aria-pressed="${(ST.lookAt || "A") === l.letter}">${l.letter} · ${esc(l.shown?.family_name || lk.families?.[l.family] || l.family)}</button>`).join("")}</div>`;
    return `${head}<p class="sdim small lmeta">Made from revision ${lk.base}${lk.base !== L ? ` (the site is at revision ${L} now)` : ""} · ${esc(when(lk.made_at))}</p>
      ${(lk.failed || []).length && !lk.working ? `<p class="smsg bad" role="status">${esc(lk.failed.at(-1).said)}</p>` : ""}${sw}<div class="looks">${lk.letters.map((l) => lookCard(lk, l)).join("")}</div>`;
  }

  // ---- S6 THE CRITIC (screen 6): the referee's gates, then the critic's answers, for one look
  function criticHtml() {
    const lk = lkView();
    const head = `<div class="lhead"><div class="t"><h2 class="mid">The critic</h2><p class="sdim small">The gates are the referee: a look that fails one is not shown, whatever the critic thinks. The critic (ChatGPT, unless Studio settings say otherwise) sees only the screenshots.</p></div></div>`;
    if (!lk) return `${head}<div class="scard pad empty"><h3>Nothing to critique yet</h3><p>Make three looks first; each one comes here with its gates and its critique.</p><button class="sbtn" data-act="pane" data-pane="looks">Go to Looks</button></div>`;
    const at = ST.criticAt || "A", l = lk.letters.find((x) => x.letter === at) || lk.letters[0], x = l.shown || l.last;
    const sw = `<div class="lsw all" role="group" aria-label="Which look">${lk.letters.map((m) => `<button class="sbtn sm" data-act="criticat" data-l="${m.letter}" aria-pressed="${m.letter === l.letter}">${m.letter} · ${esc(m.shown?.family_name || lk.families?.[m.family] || m.family)}</button>`).join("")}</div>`;
    if (!x) return `${head}${sw}<div class="scard pad"><p class="sdim">Look ${l.letter} has not been made yet.</p>${lookJobLine(l)}</div>`;
    const gates = x.gates ? `<ol class="gates">${x.gates.map((g) => `<li class="gate ${g.pass === true ? "ok" : g.pass === false ? "bad" : "na"}"><span class="gk mono">${g.key}</span><div><p><b>${esc(g.name)}</b></p><p class="sdim small">${esc(g.said)}</p></div>
        <span class="gp">${g.pass === true ? "Pass" : g.pass === false ? "Fail" : "Later"}</span></li>`).join("")}</ol>` : `<p class="sdim">${esc(x.said || "Not checked yet.")}</p>`;
    const sum = x.critic?.summary;
    const crit = sum ? `<div class="cscore"><p class="big2 mono ${sum.pass ? "ok" : "warn"}" aria-label="${sum.score} out of 100">${Math.round(sum.score)}</p><div><p><b>${sum.pass ? "Passes the critic." : "Under the critic's pass mark."}</b> ${sum.score} out of 100; the pass mark is ${sum.scoreMinimum}. ${sum.passes} of 12 answers good (needs ${sum.payMinimum})${sum.critical.length ? `. A must-pass question failed: ${sum.critical.map((k) => `“${esc(sum.pay.find((p) => p.key === k)?.q || k)}”`).join(", ")}` : ""}.</p>
          <p class="sdim small">${esc(makerName("chatgpt:" + x.critic.model).replace(/^ChatGPT claude$/, "Claude"))} · ${esc(when(x.critic.at))}</p></div></div>
        ${sum.fixes.length ? `<h3>The fixes that matter most</h3><ol class="fixes">${sum.fixes.map((f) => `<li><b>${esc(f.what)}</b><span>${esc(f.evidence)}</span></li>`).join("")}</ol>
          ${l.job ? "" : `<button class="sbtn" data-act="lookremake" data-l="${l.letter}"${ST.busy["lookremake" + l.letter] ? " disabled" : ""}>Remake look ${l.letter} with these fixes</button>`}` : `<p class="sdim small">The critic found nothing to fix.</p>`}
        <details class="qs"><summary>The twelve questions, with the critic's answers</summary><ol>${sum.pay.map((q) => `<li class="${q.good ? "ok" : "bad"}"><span class="qa">${q.good ? IC.ok : IC.bad}</span><div><p>${esc(q.q)} <b>${esc(q.answer)}</b></p><p class="sdim small">${esc(q.evidence)}</p></div></li>`).join("")}</ol></details>`
      : x.critic?.error ? `<p class="sdim">${esc(x.critic.error)}</p>` : x.status === "shown" ? `<p class="sdim">The critic has not answered yet.</p>${lookJobLine(l)}` : `<p class="sdim">Not critiqued: a look that fails a gate is not sent to the critic.</p>`;
    // what the critic saw: the screens exactly as a visitor sees them (review F5), and only for a version that passed every
    // gate (review F6: a hidden version's pictures are not shown, and the server does not serve them)
    const VIEW = { top: "first screen", second: "second screen", reviews: "reviews", booking: "booking form" };
    const seen = x.status === "shown" ? (x.views || []).map((f) => /^(d+)xd+-(top|second|reviews|booking).png$/.exec(f)).filter(Boolean) : [];
    const shots = seen.length ? `<div class="shots">${seen.map(([, w, v]) => { const u = `${shotUrl(lk, l.letter, x, w)}&view=${v}`; return `<a href="${esc(u)}" target="_blank" rel="noopener" class="shot"><img src="${esc(u)}" alt="Look ${l.letter}, ${w} wide, ${VIEW[v]}" loading="lazy" width="160"><span>${w} wide · ${VIEW[v]}</span></a>`; }).join("")}</div>` : "";
    return `${head}${sw}<p class="sdim small lmeta">Look ${l.letter} · ${esc(x.family_name)} · version ${x.v}${l.versions > 1 ? ` of ${l.versions}` : ""} · ${esc(makerName(x.maker))}</p>
      <div class="cgrid"><section class="scard" aria-labelledby="stuGatesH"><h2 class="h" id="stuGatesH">Gates <span class="n">site-browser.mjs</span></h2>${gates}</section>
        <section class="scard" aria-labelledby="stuCritH"><h2 class="h" id="stuCritH">Critic</h2>${crit}
          ${x.status === "shown" ? `<div class="taste row" role="group" aria-label="Your verdict on look ${l.letter}"><span class="sdim small">Your verdict:</span>${[["love", "Love it"], ["no", "No"]].map(([v, t]) => `<button class="sbtn sm tv ${v}" data-act="looktaste" data-l="${l.letter}" data-verdict="${v}" aria-pressed="${l.taste === v}">${t}</button>`).join("")}</div>` : ""}</section>
        ${shots ? `<section class="scard" aria-labelledby="stuShotsH"><h2 class="h" id="stuShotsH">What the critic saw</h2>${shots}</section>` : ""}</div>`;
  }
  // ---- S7 THE DETAILER: ask for their view (a link and an email draft), the links and what they did, the emails
  const NAME_OF = { hero: "First screen", catalog: "Prices", proof: "Photos and reviews", visit: "Hours and contact", booking: "Booking" };
  function commentCardHtml(c) {
    const sec = (shownSpec()?.pages?.[0]?.sections || []).find((x) => x.id === c.target?.section);
    const foot = c.status === "binned" ? `<p class="sdim small">Kept as it is${c.why ? `: ${esc(c.why)}` : "."}</p>`
      : c.asked_job ? `<p class="done">${IC.ok}<span>You asked the AI to make it. Its cards come here.</span></p>`
      : `<div class="acts"><button class="sbtn pri sm" data-act="cardask" data-id="${c.id}"${ST.busy["cardask" + c.id] ? " disabled" : ""}>${ST.busy["cardask" + c.id] ? "Asking…" : "Ask the AI to make this"}</button></div>
        <div class="keep"><label for="stuWhy-${c.id}">Or keep it as it is, and say why (the detailer reads this)</label>
          <div class="row tight"><input id="stuWhy-${c.id}" type="text" maxlength="200" placeholder="For example: the photo is the newest one you sent"><button class="sbtn sm" data-act="keepcomment" data-id="${c.id}"${ST.busy["keep" + c.id] ? " disabled" : ""}>Keep as it is</button></div>${msg("keep" + c.id)}</div>`;
    return `<li class="ccard comment ${esc(c.status)}" id="stuCard-${c.id}"><div class="src"><span class="who">From ${esc(c.from || "the detailer")}</span><span class="mono">card ${c.id} · on revision ${esc(c.patch.revision)}</span></div>
      <p class="what">${esc(NAME_OF[sec?.type] || c.target?.section || "The site")}${c.target?.part ? ` · ${esc(c.target.part.replace(/_/g, " "))}` : ""}</p>
      <blockquote class="said">“${esc(c.patch.text)}”</blockquote><p class="sdim small">A comment is a request. Nothing changes until you ask the AI to make it, or change the words yourself.</p>${foot}</li>`;
  }
  // an editable draft (subject and words); {{link}} marks where the private link goes, {{until}} its last day
  function emailForm(e) {
    const d = ST.drafts7?.[e.id] || e;
    return `<details${ST.drafts7?.[e.id] ? " open" : ""}><summary>Read or change the email</summary><div class="ef" id="stuEmailForm-${e.id}">
      <label for="stuSub-${e.id}">Subject</label><input id="stuSub-${e.id}" type="text" maxlength="150" value="${esc(d.subject)}">
      <label for="stuBody-${e.id}">Email</label><textarea id="stuBody-${e.id}" rows="12" maxlength="5000">${esc(d.body)}</textarea>
      <p class="sdim small">{{link}} is where the private link goes and {{until}} its last day: both are filled in when you press Send.</p></div></details>`;
  }
  const PURPOSE = { review: (l) => `Review of revision ${l.revision}`, choose: () => "Pick one of the three looks" };
  const STATE = { active: ["ok", "Open"], expired: ["warn", "Expired"], cancelled: ["", "Cancelled"], waiting: ["warn", "Waiting for its email’s Send"] };
  function detailHtml() {
    const d = ST.detail, x = d.detailer || { links: [], emails: [] }, L = latest(), lk = lkView(), biz = d.site.name;
    const checked = d.checks.find((c) => c.rev === L && c.ok), looksReady = lk && lk.letters.every((l) => l.shown);
    const head = `<div class="lhead"><div class="t"><h2 class="mid">The detailer</h2>
      <p class="sdim">What ${esc(biz)} sees and says. They can look, comment and pick a look; they cannot change anything. Their comments come to you as change cards, and nothing is sent to them without your Send.</p></div></div>`;
    const ask = `<section class="scard" aria-labelledby="stuAskD"><h2 class="h" id="stuAskD">Ask for their view</h2>
      <div class="dask"><div><p><b>Send revision ${L ?? "…"} for review.</b> A link to use the site and comment on it, and an email to send it.</p>
        ${checked ? "" : `<p class="sdim">Revision ${L ?? "…"} needs a passed connection check first (under Data).</p>`}
        <button class="sbtn pri" data-act="linkreview"${!checked || ST.busy.linkreview ? " disabled" : ""}>${ST.busy.linkreview ? "Making it…" : "Make the review link and email"}</button>${msg("linkreview")}</div>
      <div><p><b>Send the three looks.</b> A link to open each look and pick one, and an email to send it.</p>
        ${looksReady ? "" : `<p class="sdim">All three looks must be shown first (under Looks).</p>`}
        <button class="sbtn" data-act="linklooks"${!looksReady || ST.busy.linklooks ? " disabled" : ""}>${ST.busy.linklooks ? "Making it…" : "Make the pick-a-look link and email"}</button>${msg("linklooks")}</div></div></section>`;
    const emails = `<section class="scard" aria-labelledby="stuEm"><h2 class="h" id="stuEm">Emails <span class="n">${x.emails.length}</span></h2>
      ${x.emails.length ? `<ul class="ems">${x.emails.map((e) => `<li class="em ${e.status}"><div class="emh"><b>${esc(e.subject)}</b>${e.status === "draft" ? '<span class="chip warn">Waiting for your yes</span>' : '<span class="chip ok">Approved · would send</span>'}</div>
        <p class="sdim">To: ${e.to ? esc(e.to) : "no address in the dashboard"} · drafted ${esc(when(e.created_at))}${e.approved_at ? ` · approved ${esc(when(e.approved_at))}` : ""}</p>
        ${e.status === "draft" ? emailForm(e) : `<details><summary>Read the email</summary><pre class="body">${esc(e.body)}</pre></details>`}
        ${ST.shown7?.[e.id] ? `<div class="sent1"><p><b>What would be sent</b> (shown this once; the link is in it)</p><pre class="body">${esc(ST.shown7[e.id].body)}</pre></div>` : ""}
        ${e.status === "draft" ? `<div class="acts"><button class="sbtn sm" data-act="emailsave" data-id="${e.id}"${ST.busy["emailsave" + e.id] ? " disabled" : ""}>Save changes</button><button class="sbtn pri sm" data-act="emailsend" data-id="${e.id}"${ST.busy["emailsend" + e.id] ? " disabled" : ""}>Send</button></div>` : ""}${msg("email" + e.id)}</li>`).join("")}</ul>`
        : '<p class="sdim">No emails yet. Making a link above drafts one.</p>'}
      <p class="sdim small">Sending email is not built yet: Send marks a draft approved, and nothing leaves this laptop.</p>
      ${d.detailer?.comments ? `<button class="sbtn" data-act="emailchanges"${ST.busy.emailchanges ? " disabled" : ""}>Draft “We made your changes”</button>${msg("emailchanges")}` : ""}</section>`;
    const links = `<section class="scard" aria-labelledby="stuLk"><h2 class="h" id="stuLk">Links <span class="n">${x.links.length}</span></h2>${msg("links")}
      ${x.links.length ? `<ul class="lks">${x.links.map((l) => { const [cls, word] = STATE[l.state]; const did = [l.comments ? (l.comments === 1 ? "1 comment" : `${l.comments} comments`) : "", Object.keys(l.thumbs || {}).length ? (Object.keys(l.thumbs).length === 1 ? "1 part rated" : `${Object.keys(l.thumbs).length} parts rated`) : "", l.approved_at ? "happy with it" : "", l.picked ? `picked look ${l.picked}` : ""].filter(Boolean).join(" · ");
        const canUse = l.picked && lk && lk.id === l.set && lk.letters.find((m) => m.letter === l.picked)?.shown;
        return `<li class="lk1"><div class="emh"><b>${esc(PURPOSE[l.purpose](l))}</b><span class="chip ${cls}">${word}</span></div>
          <p class="sdim">Made ${esc(when(l.created_at))} · ${l.state === "active" ? `works until ${esc(when(l.expires_at))}` : l.state === "waiting" ? "it opens once its email is approved" : l.state}</p>
          <p>${did ? esc(did) : '<span class="sdim">Not opened yet, or nothing said yet.</span>'}</p>
          ${l.hosted_error ? `<p class="smsg bad">Not on the platform yet: ${esc(l.hosted_error)}. The Studio tries again by itself.</p>` : l.hosted && l.state === "active" ? '<p class="sdim small">Opens on any phone.</p>' : ""}
          <div class="acts">${canUse ? `<button class="sbtn pri sm" data-act="usepick" data-l="${l.picked}"${ST.busy["lookuse" + l.picked] ? " disabled" : ""}>Use look ${l.picked}, as they picked</button>` : ""}
          ${l.state === "active" || l.state === "waiting" ? `<button class="sbtn ghost sm" data-act="linkrevoke" data-id="${esc(l.id)}">Cancel link</button>` : ""}</div></li>`; }).join("")}</ul>`
        : '<p class="sdim">No links yet.</p>'}
      <p class="sdim small">A link’s secret is made when its email is approved and goes only into that email. Only a fingerprint of it is kept here, so a lost email means a new link.</p>
      ${x.hosted ? `<p class="sline"><i class="dot ${x.hosted.said ? "bad" : "ok"}" aria-hidden="true"></i><span>${x.hosted.said ? esc(x.hosted.said) : `Links open on any phone at <span class="mono">${esc(x.hosted.site.replace(/^https?:\/\//, ""))}/p/…</span>${x.hosted.which === "staging" ? " (staging)" : ""}. Comments come back here${x.hosted.synced_at ? `; last looked ${esc(ago(x.hosted.synced_at))}` : ""}.`}</span></p>
        <button class="sbtn sm" data-act="linksync"${ST.busy.linksync ? " disabled" : ""}>${ST.busy.linksync ? "Looking…" : "Look for their comments now"}</button>${msg("linksync")}`
        : '<p class="sdim small">Links open on this laptop only. To let detailers open them on their own phones, turn on “Detailer links and website forms” in Studio settings.</p>'}</section>`;
    return `${head}<div class="dgrid">${ask}${emails}${links}</div>`;
  }
  // ---- S8: publish (STUDIO-SPEC §1e). Every condition as a tick; Publish and Go back each ask "Press again", inline.
  function liveHtml() {
    const d = ST.detail, p = d.publish; if (!p) return "";
    const biz = d.site.name, armed = (k) => !!ST.armed?.[k], hour = ST.ov?.settings?.parityHour ?? 3;
    const at = (h) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase());
    const head = `<div class="lhead"><div class="t"><h2 class="mid">Publish</h2>
      <p class="sdim">What ${esc(biz)}'s customers see. A revision goes live only when every line below is ticked and you press Publish twice. Going back is one press (and a second to confirm). Prices, hours and bookings are never part of a release: they stay in the dashboard.</p></div></div>`;
    const alarm = p.alarm ? `<div class="alarm" role="alert"><b>Alarm.</b> ${esc(p.alarm.what)}</div>` : "";
    const act1 = (r) => {
      if (r.ok || r.running) return "";
      if (r.key === "gates") return `<button class="sbtn sm" data-act="pubgates"${ST.busy.pubgates ? " disabled" : ""}>Run the gates</button>${msg("pubgates")}`;
      if (r.key === "connection") return `<button class="sbtn ghost sm" data-act="pane" data-pane="check">Open Data</button>`;
      if (r.key === "approved") return `<details class="over"${ST.overOpen ? " open" : ""}><summary data-act="overopen">Publish without their yes</summary><label for="stuPubWhy">Why it goes live without their yes (kept with the release)</label>
        <div class="row tight"><input id="stuPubWhy" type="text" maxlength="200" placeholder="For example: they approved it on the phone"><button class="sbtn sm" data-act="puboverride"${ST.busy.puboverride ? " disabled" : ""}>Save the reason</button></div>${msg("puboverride")}</details>`;
      return "";
    };
    const rows = `<ol class="check">${p.rows.map((r) => `<li class="cl ${r.ok ? "ok" : r.running ? "run" : "bad"}"><i aria-hidden="true">${r.ok ? IC.ok : r.running ? "" : IC.bad}</i><span>${esc(r.says)}${act1(r)}</span></li>`).join("")}</ol>`;
    const btn = p.same ? `<p class="sdim">Revision ${p.rev} is what is live.</p>`
      : `<button class="sbtn pri" data-act="publish"${!p.ready || ST.busy.publish ? " disabled" : ""}>${ST.busy.publish ? "Publishing…" : armed("publish") ? `Press again to publish ${esc(biz)}` : `Publish revision ${p.rev ?? "…"}`}</button>`;
    const gate = `<section class="scard" aria-labelledby="stuPubH"><h2 class="h" id="stuPubH">Revision ${p.rev ?? "…"}</h2>${rows}
      <div class="pacts">${btn}</div>${msg("publish")}
      ${p.example ? '<p class="sdim small">This is the example business. Its dashboard is a test copy, so it can only go live on its test address, here on this laptop.</p>' : ""}</section>`;
    const L = p.live, appr = (r) => r.approval?.by === "detailer" ? `${esc(biz)} said yes` : `you went ahead without their yes (${esc(r.approval?.why || "")})`;
    const live = `<section class="scard" aria-labelledby="stuLiveH"><h2 class="h" id="stuLiveH">Live now</h2>
      ${L ? `<p><b>Release ${L.n}</b> · revision ${L.revision} · at <span class="mono">${esc(L.hosts?.[0] || "")}</span></p>
        <p class="sdim">Live since ${esc(when(L.published_at))} · renderer <span class="mono">${esc(L.renderer_version)}</span> · ${appr(L)}</p>
        <div class="pacts">${p.testUrl ? `<a class="sbtn sm" href="${esc(p.testUrl)}" target="_blank" rel="noopener">Open the live site (test address)</a>` : '<span class="sdim small">Turn on the phone preview to open the live site here.</span>'}
          ${p.canRollback ? `<button class="sbtn ghost sm" data-act="pubrollback"${ST.busy.pubrollback ? " disabled" : ""}>${armed("pubrollback") ? "Press again to go back" : "Go back to the previous release"}</button>` : ""}</div>${msg("pubrollback")}`
        : '<p class="sdim">Nothing is live yet.</p>'}</section>`;
    const q = p.parity;
    const parity = `<section class="scard" aria-labelledby="stuParH"><h2 class="h" id="stuParH">Nightly check of the live site</h2>
      <p class="sdim">Every night at ${esc(at(hour))} the live site is opened on its own address and every price, hour, photo and review on it is compared with the dashboard; the booking system is asked for a quote (nothing is booked). A difference is an alarm here and for the watcher.</p>
      ${q ? `<p class="sline"><i class="dot ${q.ok ? "ok" : "bad"}" aria-hidden="true"></i><b>${q.ok ? "Matches the dashboard" : "Does not match"}</b> <span class="sdim">· release ${q.release} · ${esc(when(q.at))}</span></p>
        ${q.ok ? "" : `<ol class="check">${q.lines.filter((l) => !l.pass).map((l) => `<li class="cl ${l.skipped ? "skip" : "bad"}"><i aria-hidden="true">${l.skipped ? "" : IC.bad}</i><span>${esc(l.says)}${l.detail ? `<span class="det">${esc(l.detail)}</span>` : ""}</span></li>`).join("")}</ol>${q.error ? `<p class="smsg bad">${esc(q.error)}</p>` : ""}`}`
        : `<p class="sdim">${L ? "Not checked yet." : "It starts once a site is live."}</p>`}
      ${L ? `<div class="pacts"><button class="sbtn sm" data-act="pubparity"${p.parityRunning || ST.busy.pubparity ? " disabled" : ""}>${p.parityRunning || ST.busy.pubparity ? "Checking the live site…" : "Check it now"}</button></div>${msg("pubparity")}` : ""}</section>`;
    const rels = p.releases.length ? `<section class="scard" aria-labelledby="stuRelH"><h2 class="h" id="stuRelH">Releases <span class="n">${p.releases.length}</span></h2>
      <ul class="rels">${p.releases.map((r) => `<li><b>Release ${r.n}</b> · revision ${r.revision}${L && L.n === r.n ? ' <span class="chip ok">Live</span>' : r.rolled_back_at ? ' <span class="chip">Gone back from</span>' : ""}
        <span class="sdim">${esc(when(r.published_at))} · ${appr(r)}${r.rolled_back_at ? ` · gone back from ${esc(when(r.rolled_back_at))}` : ""}</span></li>`).join("")}</ul></section>` : "";
    return `${head}${alarm}<div class="dgrid">${gate}${live}${parity}${rels}</div>`;
  }
  function settingsHtml() {
    const o = ST.ov, v = o.settings;
    return `${settingsHead()}
      <form class="scard pad sform nomic" id="stuSet" novalidate>${o.fields.map((f) => `<label class="srow" for="stuF-${f.key}"><b>${esc(f.label)}</b>
        ${f.kind === "choice" ? `<select id="stuF-${f.key}" name="${f.key}">${f.choices.map(([k, l]) => `<option value="${esc(k)}"${v[f.key] === k ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`
          : f.kind === "text" ? `<textarea id="stuF-${f.key}" name="${f.key}" rows="2" maxlength="${f.max || 200}">${esc(v[f.key])}</textarea>`
          : f.kind === "folders" ? `<textarea id="stuF-${f.key}" name="${f.key}" rows="3" spellcheck="false" autocomplete="off">${esc(v[f.key])}</textarea>`
          : `<input id="stuF-${f.key}" name="${f.key}" ${f.kind === "folder" ? 'type="text" spellcheck="false" autocomplete="off"' : `type="number" inputmode="numeric" step="1" min="${f.kind === "port" ? 1024 : f.min}" max="${f.kind === "port" ? 65535 : f.max}"`} value="${esc(v[f.key])}">`}
        <span class="sdim small">${esc(f.why)} Default: ${f.kind === "choice" ? esc(f.choices.find(([k]) => k === f.default)?.[1] || f.default) : `<span class="mono">${esc(f.default)}</span>`}.</span><span class="smsg bad" data-err="${f.key}" hidden></span></label>`).join("")}
        <div class="row"><button class="sbtn pri" type="submit"${ST.busy.settings ? " disabled" : ""}>Save</button><span class="smsg" id="stuSetMsg" role="status"></span></div></form>`;
  }

  // ---------------------------------------------------------------- actions
  async function act(key, fn, busy = true) {
    if (ST.busy[key]) return;
    ST.busy[key] = busy; delete ST.msg[key]; paint();
    try { const r = await fn(); if (r && r.said) ST.msg[key] = { ok: !!r.ok, said: r.said }; return r; }
    catch (e) { ST.msg[key] = { ok: false, said: "Could not reach the Control Room: " + e.message }; }
    finally { ST.busy[key] = false; await load(); }
  }
  function go(screen, site) {
    ST.screen = screen; if (site !== undefined) ST.site = site;
    ST.msg = {}; ST.shown = null; ST.pick = null; ST.sheet = null; ST.previewCard = null; ST.draft = null; keep();
    const box = document.getElementById("stuBox"); if (box) box.dataset.screen = "";
    window.scrollTo(0, 0); root()?.querySelector(".stu")?.scrollTo?.(0, 0);
    load();
  }
  const say = (k, r) => { if (r?.said) ST.msg[k] = { ok: !!r.ok, said: r.said }; };
  function onClick(e) {
    const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === "go") return go(b.dataset.to);
    if (a === "open") { ST.rev = null; return go("site", b.dataset.site); }
    if (a === "reload") return load();
    // switching panes only shows and hides them: the frame is not rebuilt (that would cut its page off mid-load)
    if (a === "pane") { ST.pane = b.dataset.pane; if (ST.pane !== "preview") ST.sheet = null; keep(); paint(); fit(); return; }
    if (a === "rev") { delete ST.msg.undo; ST.rev = Number(b.dataset.n); ST.shown = null; ST.pick = null; ST.previewCard = null; if (ST.sheet === "insp") ST.sheet = null; if (!WIDE()) ST.pane = "preview"; keep(); load(); return; }
    if (a === "mode") {
      ST.mode = b.dataset.m; keep();
      if (ST.mode === "browse" && ST.sheet === "insp") { ST.sheet = null; ST.pick = null; }
      toFrame({ type: "studio-mode", mode: canSelect() ? ST.mode : "browse" }); paint(); return;
    }
    if (a === "words") { ST.pick = null; ST.draft = null; ST.sheet = ST.sheet === "insp" ? null : "insp"; toFrame({ type: "studio-clear" }); paint(); if (ST.sheet) document.querySelector("#stuInsp h2")?.focus({ preventScroll: true }); return; }
    if (a === "cards") { ST.sheet = ST.sheet === "cards" ? null : "cards"; paint(); if (ST.sheet) document.getElementById("stuCardsH")?.focus({ preventScroll: true }); return; }
    if (a === "closesheet") return closeSheet();
    if (a === "field") return openPick({ section: b.dataset.n, part: b.dataset.field, from: null });
    if (a === "example") return act("example", () => post("/api/studio/example"));
    if (a === "startbiz") return act("startbiz", () => post("/api/studio/business", { slug: document.getElementById("stuBiz")?.value || "" }));
    if (a === "start") return act("start", () => post("/api/studio/preview/start")).then((r) => { if (r && !r.ok) ST.msg.server = ST.msg.start; delete ST.msg.start; ST.stageKey = null; paint(); });
    if (a === "stop") return act("stop", () => post("/api/studio/preview/stop")).then(() => { ST.msg.server = ST.msg.stop; delete ST.msg.stop; ST.stageKey = null; paint(); });
    if (a === "newrev") return act("newrev", () => post("/api/studio/revision", { site: ST.site })).then((r) => { if (r?.ok && r.n) { ST.rev = r.n; ST.shown = null; keep(); load(); } });
    if (a === "check") return act("check", () => post("/api/studio/check", { site: ST.site, rev: ST.rev })).then((r) => { if (r?.ok) delete ST.msg.check; ST.shown = null; load(); });
    if (a === "apply" || a === "applyall") {
      const ids = a === "apply" ? [Number(b.dataset.id)] : ST.detail.cards.filter((c) => c.status === "proposed" && c.base === latest() && c.patch?.op !== "comment").map((c) => c.id);
      const key = a === "apply" ? "apply" + ids[0] : "applyall";
      return act(key, () => post("/api/studio/card/apply", { site: ST.site, ids })).then((r) => {
        say("cards", r); delete ST.msg[key];
        if (r?.ok && r.n) { ST.rev = r.n; ST.previewCard = null; keep(); }
        load();
      });
    }
    if (a === "bin") return act("bin" + b.dataset.id, () => post("/api/studio/card/bin", { site: ST.site, id: Number(b.dataset.id) })).then((r) => { say("cards", r); delete ST.msg["bin" + b.dataset.id]; if (ST.previewCard === Number(b.dataset.id)) ST.previewCard = null; load(); });
    if (a === "redo") return act("redo" + b.dataset.id, () => post("/api/studio/card/redo", { site: ST.site, id: Number(b.dataset.id) })).then((r) => { say("cards", r); delete ST.msg["redo" + b.dataset.id]; load(); });
    if (a === "cardpreview") {
      const id = Number(b.dataset.id);
      ST.previewCard = ST.previewCard === id ? null : id; ST.rev = latest(); ST.pick = null;
      if (!WIDE()) { ST.sheet = null; ST.pane = "preview"; }
      paint(); document.getElementById("stuTools")?.scrollIntoView({ block: "start" }); return;
    }
    if (a === "unpreview") { ST.previewCard = null; paint(); return; }
    if (a === "try") { const t = document.getElementById("stuAskText"); if (t) { t.value = b.dataset.text; t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
    if (a === "askstop" || a === "askagain") {
      const id = b.dataset.id;
      return act(a + id, () => post(a === "askstop" ? "/api/studio/ask/cancel" : "/api/studio/ask/again", { id })).then((r) => { askSaid(r); delete ST.msg[a + id]; load().then(tick); });
    }
    if (a === "seecard") {
      const id = Number(b.dataset.id);
      if (!WIDE()) { ST.pane = "preview"; ST.sheet = "cards"; keep(); }
      paint(); fit();
      const c = document.getElementById("stuCard-" + id);
      c?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      c?.querySelector("button")?.focus({ preventScroll: true });
      return;
    }
    if (a === "quick") return askPart(b.dataset.text, "typed");
    // ---- S6: looks, the critic, the taste log
    if (a === "lookat") { ST.lookAt = b.dataset.l; paint(); return; }
    // ---- S8: publish
    // the reason box stays open across repaints (a poll, an answer) until it is closed by hand
    if (a === "overopen") { ST.overOpen = !b.closest("details").open; return; }
    if (a === "pubgates") return act("pubgates", () => post("/api/studio/publish/gates", { site: ST.site }));
    if (a === "puboverride") { const why = root().querySelector("#stuPubWhy")?.value || ""; return act("puboverride", () => post("/api/studio/publish/override", { site: ST.site, why })); }
    if (a === "publish" || a === "pubrollback") {
      // inline "Press again" (never a pop-up): the first press arms it for 8 seconds
      if (!ST.armed?.[a]) { (ST.armed ||= {})[a] = true; delete ST.msg[a]; paint(); setTimeout(() => { if (ST.armed?.[a]) { ST.armed[a] = false; paint(); } }, 8000); return; }
      ST.armed[a] = false;
      return act(a, () => post(a === "publish" ? "/api/studio/publish" : "/api/studio/publish/rollback", { site: ST.site, confirm: true }));
    }
    if (a === "pubparity") return act("pubparity", () => post("/api/studio/publish/parity", { site: ST.site }));
    // ---- S7: the detailer
    // an opened answer list stays open across the page's own refreshes
    if (a === "formopen") { (ST.formOpen ||= {})[b.dataset.b] = !b.closest("details").open; return; }
    if (a === "readsite") { const k = "read" + b.dataset.b; return act(k, () => post("/api/studio/forms/read", { business: b.dataset.b })); }
    if (a === "linksync") return act("linksync", () => post("/api/studio/links/sync", {}));
    if (a === "linkreview" || a === "linklooks") return act(a, () => post(a === "linkreview" ? "/api/studio/links/review" : "/api/studio/links/looks", { site: ST.site }));
    if (a === "linkrevoke") return act("linkrevoke" + b.dataset.id, () => post("/api/studio/links/revoke", { site: ST.site, id: b.dataset.id })).then((r) => { if (r) ST.msg.links = { ok: !!r.ok, said: r.said }; delete ST.msg["linkrevoke" + b.dataset.id]; paint(); });
    if (a === "emailsend") return act("emailsend" + b.dataset.id, () => post("/api/studio/emails/send", { site: ST.site, id: Number(b.dataset.id) })).then((r) => { if (r) ST.msg["email" + b.dataset.id] = { ok: !!r.ok, said: r.said }; if (r?.shown) (ST.shown7 ||= {})[b.dataset.id] = r.shown; delete ST.msg["emailsend" + b.dataset.id]; paint(); });
    if (a === "emailsave") {
      const k = b.dataset.id, f = root().querySelector(`#stuEmailForm-${k}`);
      return act("emailsave" + k, () => post("/api/studio/emails/edit", { site: ST.site, id: Number(k), subject: f.querySelector("input").value, body: f.querySelector("textarea").value })).then((r) => { if (r) ST.msg["email" + k] = { ok: !!r.ok, said: r.said }; delete ST.msg["emailsave" + k]; if (r?.ok) delete ST.drafts7?.[k]; paint(); });
    }
    if (a === "keepcomment") {
      const k = b.dataset.id, why = root().querySelector(`#stuWhy-${k}`)?.value || "";
      return act("keep" + k, () => post("/api/studio/card/keep", { site: ST.site, id: Number(k), why })).then((r) => { say("cards", r); if (!r?.ok) ST.msg["keep" + k] = { ok: false, said: r?.said }; else delete ST.msg["keep" + k]; load(); });
    }
    if (a === "emailchanges") return act("emailchanges", () => post("/api/studio/emails/changes", { site: ST.site }));
    if (a === "cardask") return act("cardask" + b.dataset.id, () => post("/api/studio/card/ask", { site: ST.site, id: Number(b.dataset.id) })).then((r) => { say("cards", r); delete ST.msg["cardask" + b.dataset.id]; load().then(tick); });
    if (a === "usepick") { const L = b.dataset.l; return act("lookuse" + L, () => post("/api/studio/looks/use", { site: ST.site, set: lkView()?.id, letter: L })).then((r) => { if (r) ST.msg.links = { ok: !!r.ok, said: r.said }; delete ST.msg["lookuse" + L]; if (r?.ok && r.n) { ST.rev = r.n; keep(); } load(); }); }
    if (a === "criticat") { ST.criticAt = b.dataset.l; paint(); return; }
    if (a === "seecritic") { ST.criticAt = b.dataset.l; ST.pane = "critic"; keep(); paint(); document.getElementById("stuPane-critic")?.scrollIntoView({ block: "start" }); return; }
    if (a === "looksmake") return act("looksmake", () => post("/api/studio/looks/make", { site: ST.site })).then(() => tick());
    if (a === "looksstop") return act("looksstop", () => post("/api/studio/looks/stop", { site: ST.site }));
    if (a === "lookremake" || a === "lookfamily") {
      const L = b.dataset.l;
      return act(a + L, () => post("/api/studio/looks/remake", { site: ST.site, set: lkView()?.id, letter: L, ...(a === "lookfamily" ? { family: b.dataset.f } : {}) })).then((r) => { if (r) ST.msg["look" + L] = { ok: !!r.ok, said: r.said }; delete ST.msg[a + L]; paint(); tick(); });
    }
    if (a === "lookuse") {
      const L = b.dataset.l;
      return act("lookuse" + L, () => post("/api/studio/looks/use", { site: ST.site, set: lkView()?.id, letter: L })).then((r) => {
        if (r) ST.msg["look" + L] = { ok: !!r.ok, said: r.said }; delete ST.msg["lookuse" + L];
        if (r?.ok && r.n) { ST.rev = r.n; keep(); }
        load();
      });
    }
    if (a === "looktaste") {
      const L = b.dataset.l, l = lkView()?.letters.find((x) => x.letter === L), verdict = l?.taste === b.dataset.verdict ? "" : b.dataset.verdict;
      return act("looktaste" + L, () => post("/api/studio/looks/taste", { site: ST.site, set: lkView()?.id, letter: L, verdict }), false).then((r) => { if (r) ST.msg["look" + L] = { ok: !!r.ok, said: r.said }; delete ST.msg["looktaste" + L]; paint(); });
    }
    if (a === "undo") {
      const to = Number(b.dataset.n);
      return act("undo", () => post("/api/studio/undo", { site: ST.site, to, base: latest() }), to).then((r) => { if (r?.ok && r.n) { ST.rev = r.n; ST.previewCard = null; keep(); } load(); });
    }
  }
  // what the composer says back after a send (it is not repainted, so it is set here)
  function askSaid(r) {
    const m = document.getElementById("stuAskMsg"); if (!m || !r?.said) return;
    m.textContent = r.said; m.className = "smsg " + (r.ok ? "ok" : "bad"); m.hidden = false;
    clearTimeout(askSaid.t); askSaid.t = setTimeout(() => { m.hidden = true; }, 8000);
  }
  async function askPart(text, via) {
    const form = document.getElementById("stuAskPart"); if (!form) return;
    const target = { section: form.dataset.section, field: form.dataset.field || null };
    const r = await sendAsk(text, { target, via, key: "askpart" });
    if (!r) return;
    if (r.ok) { ST.partJob = r.job; delete ST.msg.askpart; ST.askDraft = null; ST.partVia = null; const t = document.getElementById("stuAskPartText"); if (t) t.value = ""; }
    else ST.msg.askpart = { ok: false, said: r.said };
    paint();
    document.querySelector("#stuAskPart .pjob, #stuAskPart .smsg")?.scrollIntoView({ block: "nearest" });
  }
  function onInput(e) {
    const ef = e.target.closest?.("[id^=stuEmailForm-]"); if (ef) { const k = ef.id.slice(13); (ST.drafts7 ||= {})[k] = { subject: ef.querySelector("input").value, body: ef.querySelector("textarea").value }; return; }
    if (e.target.id === "stuAskPartText") { ST.askDraft = e.target.value; if (e.inputType && !(typeof dictating !== "undefined" && dictating)) ST.partVia = "typed"; return; }
    // typing on the keyboard sends an InputEvent with an inputType; the speech-to-text fills the box with a plain event
    if (e.target.id === "stuAskText") { document.getElementById("stuAskMsg").hidden = true; if (!e.target.value) ST.via = null; else if (e.inputType && !(typeof dictating !== "undefined" && dictating)) ST.via = "typed"; return; }
    if (e.target.id === "stuEditText") { ST.draft = e.target.value; if (ST.editErr) { ST.editErr = null; e.target.removeAttribute("aria-invalid"); e.target.closest("form")?.querySelector("#stuEditErr")?.remove(); } return; }
    const f = e.target.closest("#stuSet [name]"); if (f) { const er = root().querySelector(`[data-err="${f.name}"]`); if (er) er.hidden = true; }
  }
  function onKey(e) {
    if (e.key === "Escape" && ST.sheet && !WIDE()) { e.preventDefault(); closeSheet(); }
    if (e.key === "Enter" && (e.target.id === "stuEditText" || e.target.id === "stuAskPartText") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.target.form?.requestSubmit(); }
    if (e.key === "Enter" && e.target.id === "stuAskText" && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.target.form?.requestSubmit(); }
  }
  async function onSubmit(e) {
    if (e.target.id === "stuAsk") {
      e.preventDefault();
      const box = document.getElementById("stuAskText"), text = box.value.trim();
      if (!text) { askSaid({ ok: false, said: HAS_SPEECH ? "Say or type what should change." : "Type what should change." }); box.focus(); return; }
      if (typeof dictating !== "undefined" && dictating) dictating.rec.stop();
      const r = await sendAsk(text, { via: ST.via === "voice" ? "voice" : "typed" });
      if (!r) return;
      askSaid(r);
      if (r.ok) { box.value = ""; ST.via = null; }
      box.focus({ preventScroll: true });
      return;
    }
    if (e.target.id === "stuAskPart") {
      e.preventDefault();
      const text = (document.getElementById("stuAskPartText")?.value || "").trim();
      if (!text) { ST.msg.askpart = { ok: false, said: "Say or type what should change, or tap a quick change." }; paint(); document.getElementById("stuAskPartText")?.focus(); return; }
      return askPart(text, ST.partVia === "voice" ? "voice" : "typed");
    }
    if (e.target.id === "stuEdit") {
      e.preventDefault();
      const form = e.target, text = form.querySelector("textarea").value;
      ST.draft = text;
      if (ST.busy.card) return;
      ST.busy.card = true; ST.editErr = null; paint();
      let r;
      try { r = await post("/api/studio/card", { site: ST.site, base: ST.rev, section: form.dataset.section, field: form.dataset.field, text }); }
      catch (err) { r = { ok: false, said: "Could not reach the Control Room: " + err.message }; }
      ST.busy.card = false;
      if (r.ok) { ST.pick = null; ST.draft = null; ST.sheet = WIDE() ? null : "cards"; toFrame({ type: "studio-clear" }); say("cards", r); await load(); document.getElementById("stuCardsH")?.focus({ preventScroll: true }); return; }
      ST.editErr = r.said || "Not saved.";
      paint();
      const ta = document.getElementById("stuEditText"); ta?.focus({ preventScroll: true });
      return;
    }
    if (e.target.id !== "stuSet") return;
    e.preventDefault();
    const form = e.target, values = {}, m = document.getElementById("stuSetMsg");
    for (const f of ST.ov.fields) { const i = form.elements[f.key]; values[f.key] = f.kind === "folder" || f.kind === "folders" || f.kind === "choice" || f.kind === "text" ? i.value : i.value === "" ? NaN : Number(i.value); }
    form.querySelectorAll("[data-err]").forEach((x) => { x.hidden = true; });
    m.textContent = "Saving…"; m.className = "smsg";
    const r = await post("/api/studio/settings", { values }).catch((err) => ({ ok: false, said: "Could not reach the Control Room: " + err.message }));
    if (r.ok) { m.textContent = "Saved."; m.className = "smsg ok"; ST.ov.settings = r.settings; ST.stageKey = null; load(); return; }
    m.textContent = "Not saved."; m.className = "smsg bad";
    const er = r.key && form.querySelector(`[data-err="${r.key}"]`);
    if (er) { er.textContent = r.said; er.hidden = false; form.elements[r.key]?.focus(); } else { m.textContent = "Not saved: " + r.said; }
  }

  // ---------------------------------------------------------------- the place
  let timer = null;
  function tick() {
    clearTimeout(timer);
    if (!visible()) return;
    const fast = ST.ov?.check || ST.ov?.preview?.starting || ST.detail?.applying || ST.detail?.ai?.running || ST.detail?.ai?.queued || ST.detail?.looks?.working || ST.detail?.publish?.parityRunning || ST.detail?.publish?.rows?.some((r) => r.running) || Object.values(ST.busy).some(Boolean);
    timer = setTimeout(async () => { if (visible() && !document.hidden && ST.screen !== "settings") await load(); tick(); }, fast ? 1200 : 8000);
  }
  window.studioPaint = () => { paint(); load().then(tick); };
  // a link straight to the Studio (#tab=studio) can open the place before this file has run
  if (visible()) window.studioPaint();
})();
