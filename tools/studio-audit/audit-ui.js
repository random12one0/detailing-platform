// AUDIT TAB — the page side. Loaded by ui.html; draws into #viewAudit.
// Six views cover the plan's twelve (audit-tab/PLAN.md §11):
//   Now        what needs Andrew first (status, waiting findings, launch line, trust), then the run:
//              coverage map, auditors at work, recent steps; "Start a new audit" opens the picker
//   Findings   every run's findings: waiting for you / sent to the roadmap / closed
//   Evidence   screenshots grouped by screen (390/768/1440 side by side) + journeys
//   Readiness  launch line, live site, 13 dimensions, outside services
//   System     what the product is made of (for the builder more than for Andrew)
//   Runs       past runs (each opens its findings), cost, how often each AI was right
//   AI & limits  who audits (Claude, ChatGPT), usage right now, the chooser's last decisions,
//              and every audit setting (they live here, not on the main Settings page — Andrew 2026-10-22)
// Rebuilt 2026-10-20 after an independent review: the picker no longer buries what is waiting.
(() => {
  const root = () => document.getElementById("viewAudit");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => n == null ? "–" : "$" + Number(n).toFixed(2);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  // R2 N-P2-9 / P2-14: an audit step said plainly (old records keep their engine words; this reads them)
  const plainStep = (t) => String(t || "").replace(/ × recheck:([\w-]+)/g, ": re-check of finding $1").replace(/: \? passed, \? failed$/, ": did not run (no result was reported)")
    .replace(/^Journey not run \(([^)]*)\): it names the live project/, "Walk-through $1 skipped: it would touch the live site").replace(/^Journey\b/, "Walk-through");
  // R2 N-P2-9: the map's kinds of piece in plain words ("37 policys", "8 dbfunctions" read as code)
  const PIECE = { policy: ["database rule", "database rules"], dbfunction: ["database function", "database functions"], cron: ["scheduled job", "scheduled jobs"],
    table: ["table", "tables"], bucket: ["storage bucket", "storage buckets"], edge: ["server function", "server functions"], function: ["server function", "server functions"], route: ["page", "pages"], screen: ["screen", "screens"] };
  const get = async (p) => { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };
  const post = async (p, body = {}) => { const r = await fetch(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return r.json(); };
  const VIEWS = [["now", "Now"], ["findings", "Findings"], ["evidence", "Evidence"], ["readiness", "Readiness"], ["system", "System"], ["runs", "Runs & cost"], ["ai", "AI & limits"]];
  const SEV = { blocker: "Launch blocker", before: "Before launch", after: "After launch", idea: "Idea" };
  const STATUS = { unverified: "Not checked yet", checking: "Being checked", probable: "2nd check: probable", confirmed: "2nd check: confirmed", disputed: "2nd check: disputed",
    rejected: "2nd check: rejected", sent: "GitHub issue created", fixed: "Belt ticked it", rechecked: "Fixed, re-checked", dismissed: "Not a problem", duplicate: "Already on the roadmap" };
  const ROLE = { code: ["Cd", "Code"], looks: ["Lk", "Looks & phones"], security: ["Sf", "Safety"], backend: ["Dt", "Data"], integrations: ["Ln", "Links"],
    product: ["Pr", "Product"], check: ["2c", "Second-check squares"], findingcheck: ["2f", "Second opinions on findings"], performance: ["Sp", "Speed"], capture: ["Ph", "Screenshots"], journey: ["Jn", "Journey"] };
  const MODEL = (m) => ({ opus: "Opus 5.5", "claude-sonnet-5-5": "Sonnet 5.5", sonnet: "Sonnet", haiku: "Haiku", "gpt-6.1-sol": "GPT-6.1 Sol", "gpt-5.6-terra": "GPT-5.6 Terra", "muse-spark-1.3-contributor": "Muse Spark (trial, ended)", browser: "browser", script: "script", engine: "the audit itself" }[m] || m || "");
  const WAITING = ["probable", "confirmed"], SENT = ["sent", "fixed", "rechecked"], CLOSED = ["rejected", "dismissed", "duplicate", "disputed", "unverified", "checking"];
  const OPENF = ["probable", "confirmed", "sent", "fixed"];

  // the cheapest useful start (review: 3 areas × 6 kinds cost ~4× the default limit)
  const pick = { areas: new Set(["Booking", "Money"]), kinds: new Set(["security", "code"]), depth: null };
  const DEPTHS = [["quick", "Quick", "middle-strength AIs, top 4 problems per square"], ["medium", "Medium", "the normal audit"], ["deep", "Deep", "strongest AIs, highest effort, up to 15 problems"]];
  let view = "now", ov = null, all = [], runFindings = [], ready = null, sevFilter = "all", stFilter = "waiting", runFilter = null;
  let openCell = null, timer = null, picking = false, stopArmed = 0;
  try { view = localStorage.getItem("auditView") || "now"; } catch {}
  if (!VIEWS.some(([k]) => k === view)) view = "now";

  // THE NEW CONTROL ROOM (body.nx, SCREENS.md §7): no "Now" pill (it clashed with the Now place). Its summary sits on
  // top, always; then Findings · Evidence · Readiness, and More holds System, Runs & cost and AI & limits.
  // Summary is a view like the others (R4-P1-3); pressing the open one keeps it (R5-P0-6). The old look is unchanged.
  const NXA = () => document.body.classList.contains("nx");
  const MAIN = ["findings", "evidence", "readiness"], MORE = ["system", "runs", "ai"];
  function shell() {
    const el = root();
    if (el.dataset.built) return;
    el.dataset.built = "1";
    if (NXA()) {
      const tabBtn = ([k, l]) => `<button role="tab" data-aview="${k}" aria-selected="${k === view}">${l}${k === "findings" ? '<i class="pip" id="audPip" hidden></i>' : ""}</button>`;
      // R4-P1-3: the views come first (they were under two phone screens of summary, at y=2006 on a phone; the old Audit
      // had them at the top) and the summary is one of them, shown alone like the others
      el.innerHTML = `<div class="aud anx">
        <div class="anav" role="tablist" aria-label="Audit views">${[["now", "Summary"], ...VIEWS.filter(([k]) => MAIN.includes(k) || MORE.includes(k))].map(tabBtn).join("")}</div>
        ${VIEWS.map(([k]) => `<section data-apanel="${k}" ${k === view ? "" : "hidden"}></section>`).join("")}
      </div>`;
      el.querySelectorAll("[data-aview]").forEach((b) => b.onclick = () => go(b.dataset.aview));   // R5-P0-6: pressing the open view keeps it (it jumped to Summary)
      return;   // P1-6: System, Runs & cost and AI & limits sit beside the others again (no "More" tap; they were 2 taps on the old Audit tab)
    }
    el.innerHTML = `<div class="aud">
      <div class="anav" role="tablist" aria-label="Audit views">${VIEWS.map(([k, l]) =>
        `<button role="tab" data-aview="${k}" aria-selected="${k === view}">${l}${k === "findings" ? '<i class="pip" id="audPip" hidden></i>' : ""}</button>`).join("")}</div>
      ${VIEWS.map(([k]) => `<section data-apanel="${k}" ${k === view ? "" : "hidden"}></section>`).join("")}
    </div>`;
    el.querySelectorAll("[data-aview]").forEach((b) => b.onclick = () => go(b.dataset.aview));
  }
  function go(k) {
    view = k; try { localStorage.setItem("auditView", k); } catch {}
    root().querySelectorAll("[data-aview]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.aview === k)));
    root().querySelectorAll("[data-apanel]").forEach((s) => s.hidden = s.dataset.apanel !== k);
    if (NXA() && k !== "now") load().then(() => paint()).catch(() => paint()); else paint();
  }
  const panel = (k) => root().querySelector(`[data-apanel="${k}"]`);

  // ── NOW ────────────────────────────────────────────────────────────────
  // Colour by OPEN problems only: rejected, duplicate, dismissed and re-checked ones no longer count.
  function cellClass(c) {
    if (c.status !== "findings") return c.status;
    const open = runFindings.filter((f) => f.cell_id === c.id && OPENF.includes(f.status));
    if (!open.length) return "clean";
    return open.some((f) => f.severity === "blocker") ? "blocker" : "findings";
  }
  function launchLine() {
    if (!ready) return "";
    const n = ready.blockers.length;
    const tested = ready.dimensions.reduce((a, x) => a + (x.tested || 0), 0), unknown = ready.dimensions.reduce((a, x) => a + (x.unknown || 0), 0);
    if (n) return `<span class="no">Not ready to launch</span>: ${plural(n, "launch blocker")} open.`;
    if (unknown > tested) return `Ready to launch: <b>not known yet</b>. ${unknown} of ${unknown + tested} checks have not been run.`;
    return `<span class="ok">No launch blockers</span> in what was tested.`;
  }
  function paintNow() {
    const p = panel("now");
    const run = ov?.run;
    const waiting = all.filter((f) => WAITING.includes(f.status));
    const blockers = waiting.filter((f) => f.severity === "blocker").length;
    const q = ov?.quality || {};
    const idle = !run || !["running", "paused", "waiting"].includes(run.status);
    let statusCard = "";
    if (run) {
      const running = run.status === "running";
      const cells = ov.cells || [];
      const live = cells.filter((c) => c.status === "running");
      const done = cells.filter((c) => ["clean", "findings", "failed", "shelved", "skipped"].includes(c.status)).length;
      const mins = run.started_at ? Math.max(0, Math.round(((run.ended_at ? Date.parse(run.ended_at) : Date.now()) - Date.parse(run.started_at)) / 60000)) : 0;
      const ago = run.ended_at ? Math.round((Date.now() - Date.parse(run.ended_at)) / 60000) : 0;
      const agoText = ago < 60 ? `${ago} min ago` : ago < 1440 ? `${Math.round(ago / 60)} h ago` : `${Math.round(ago / 1440)} days ago`;
      const cap = run.cap_usd || ov.settings?.capUsd || null, pct = cap ? Math.min(100, (run.cost_usd / cap) * 100) : 0;
      statusCard = `<div class="strip">
        <div><span class="lamp ${running ? "on" : ""}"><i></i>${running ? "Auditing now" : run.status === "paused" ? "Paused" : run.status === "waiting" ? "Waiting for an AI with room" : `Last audit ${esc(run.status === "done" ? "finished" : run.status)} ${agoText}`} · run ${run.n}</span>
          <h2>${esc(run.title)}</h2>
          <div class="meta"><span class="num">${done}</span> of <span class="num">${cells.length}</span> checks in this run · <span class="num">${usd(run.cost_usd)}</span>${cap ? ` of <span class="num">${usd(cap)}</span>` : ""} · ${Math.floor(mins / 60) ? Math.floor(mins / 60) + " h " : ""}${mins % 60} min${running ? ` · ${plural(live.length, "auditor")} working` : ""} · version <span class="num">${esc((run.git_sha || "–").slice(0, 7))}</span></div></div>
        <div class="ctl">${running ? `<button class="abtn" data-run="pause">Pause</button><button class="abtn" data-run="stop">${stopArmed > Date.now() ? "Press again to stop" : "Stop"}</button>`
          : run.status === "waiting" ? `<button class="abtn" data-run="stop">${stopArmed > Date.now() ? "Press again to stop" : "Stop"}</button>`
          : run.status === "paused" ? `<button class="abtn go" data-run="resume">Carry on</button><button class="abtn" data-run="stop">${stopArmed > Date.now() ? "Press again to stop" : "Stop"}</button>` : ""}</div>
        ${cap && !idle ? `<div class="budget ${pct > 85 ? "hot" : ""}" role="img" aria-label="Spent ${usd(run.cost_usd)} of ${usd(cap)}"><i style="transform:scaleX(${(pct / 100).toFixed(3)})"></i></div>` : ""}
        ${run.status === "waiting" && run.note ? `<p class="waitnote" style="grid-column:1/-1">${esc(run.note)} <button class="linkbtn" data-goto="ai">AI &amp; limits</button></p>` : ""}
        <div class="said" id="audRunSaid" role="status" style="grid-column:1/-1"></div>
      </div>`;
    }
    const callout = NXA() && !waiting.length ? "" : `<button class="callout ${blockers ? "bad" : waiting.length ? "warn" : ""}" data-goto="findings">
        <span><b class="num">${waiting.length}</b> ${waiting.length === 1 ? "finding waits" : "findings wait"} for your yes${blockers ? ` · <span class="no">${plural(blockers, "launch blocker")}</span>` : ""}</span><span aria-hidden="true">→</span></button>`;
    const trust = q.bench || q.falseAlarm ? `<p class="trust meta">How far to trust it: ${q.bench ? `<span class="num">${q.bench.caught} of ${q.bench.of}</span> planted faults caught${q.bench.of < 10 ? " (small test)" : ""}` : "planted faults not measured yet"}
        · ${q.falseAlarm ? `<span class="num">${q.falseAlarm.overturned} of ${q.falseAlarm.of}</span> findings overturned on checking` : ""}${q.costPerConfirmed != null ? ` · <span class="num">${usd(q.costPerConfirmed)}</span> per real problem` : ""}</p>` : "";
    const est = estimate();
    const startArea = idle ? (picking ? picker(!run, est) : `<button class="abtn wide" data-pickopen="1">Start a new audit</button>`) : "";
    const nightly = ov?.settings?.nightly !== false;
    const line = NXA() && !run ? `<div class="acard aempty"><h3>No audit has run.</h3><p class="meta">${nightly ? "It runs nightly at 3 am: screenshots of every screen and every customer journey, at no AI cost." : "Start one below."}</p></div>`
      : `<div class="launchline">${launchLine()}</div>`;
    p.innerHTML = `${statusCard}${callout}
      ${line}${trust}${startArea}${run ? mapAndLive(run) : ""}`;
    wireNow(p, run);
  }
  function mapAndLive(run) {
    const cells = ov.cells || [];
    const live = cells.filter((c) => c.status === "running");
    const inRun = (a, k) => cells.find((x) => x.area === a && x.kind === k);
    const caps = cells.filter((c) => c.kind.startsWith("capture:")), jrn = cells.filter((c) => c.kind.startsWith("journey:"));
    const extra = [caps.length ? `Screenshots: ${caps.filter((c) => ["clean", "findings"].includes(c.status)).length} of ${plural(caps.length, "area")} done` : "",
      jrn.length ? ((ran, sk) => `Walk-throughs: ${ran} of ${jrn.length} ran${sk ? `, ${sk} could not run` : ""}${jrn.length - ran - sk ? `, ${jrn.length - ran - sk} did not report` : ""}`)(jrn.filter((c) => ["clean", "findings"].includes(c.status)).length, jrn.filter((c) => c.status === "skipped").length) : ""].filter(Boolean).join(" · ");
    return `<div class="two">
      <div class="acard mapcard"><div class="sh"><h3>What this run checks</h3><span class="meta">tap a square</span></div>
        <div class="map">${"<span></span>" + ov.kinds.map((k) => `<span class="ch">${esc(k.label)}</span>`).join("")}
          ${ov.areas.map((a) => `<span class="rh">${esc(a)}</span>` + ov.kinds.map((k) => {
            const c = inRun(a, k.id);
            if (!c) return `<span class="cell out" title="not in this run" aria-label="${esc(a)} × ${esc(k.label)}: not in this run"></span>`;
            const n = runFindings.filter((f) => f.cell_id === c.id && OPENF.includes(f.status)).length;
            const cls = cellClass(c);
            return `<button class="cell ${cls}" data-cell="${esc(c.id)}" aria-pressed="${openCell === c.id}" aria-label="${esc(a)} × ${esc(k.label)}: ${esc(c.status)}">${cls === "blocker" ? "!" : n || ""}</button>`;
          }).join("")).join("")}</div>
        <div class="legend"><span><b style="background:var(--ink-1)"></b>to do</span><span><b style="border-color:var(--ac)"></b>checking now</span>
          <span><b style="background:rgba(56,224,139,.22)"></b>clean</span><span><b style="background:rgba(229,180,84,.28)"></b>problems</span>
          <span><b style="background:rgba(226,112,95,.35)"></b>launch blocker</span><span><b class="outkey"></b>not in this run</span></div>
        ${extra ? `<p class="meta" style="margin-top:8px">${esc(extra)}</p>` : ""}
        ${/* R3 N-P2-11: when none of the map's squares were in this run (a re-check run), say what it did check */ ""}${ov.areas.every((a) => ov.kinds.every((k) => !inRun(a, k.id))) ? `<p class="meta" style="margin-top:8px">None of the squares on this map were in this run: it re-checked earlier findings and ran the walk-throughs and screenshots counted above.</p>` : ""}
        <div class="celldet" id="audCell" ${openCell ? "" : "hidden"}></div>
        <p class="meta" style="margin-top:8px">A clean square means it was tested, not that nothing could be wrong.</p>
        <div class="acts"><button class="abtn sm" data-ask="${esc(run.id)}">Ask about this run</button></div></div>
      <div class="acard"><div class="sh"><h3>Auditors working</h3>${NXA() && !live.length ? "" : `<span class="meta num">${live.length}</span>`}</div>
        ${live.length ? live.map((c) => { const [ab, nm] = ROLE[c.role] || ["··", c.role]; return `<div class="agent"><span class="av">${esc(ab)}</span>
          <div><b>${esc(nm)}</b> <span class="on">${esc(MODEL(c.model))} · ${esc(c.area)}</span></div><span class="meta num">${usd(c.cost_usd)}</span>
          <div class="step">${esc(c.step || "starting")}</div></div>`; }).join("") : `<div class="empty">${run.status === "running" ? "Between steps." : "No auditor is working right now."}</div>`}
        <div class="sh" style="margin-top:var(--sp-4)"><h3>Recent steps</h3></div><ul class="feed" id="audFeed"><li class="meta">Loading…</li></ul></div>
    </div>`;
  }
  const depthNow = () => pick.depth || ov?.depth || "medium";
  function estimate() {
    const dc = (ov?.depthUsd || {})[depthNow()] || { usd: ov?.perSquareUsd || 5, measured: true }, per = dc.usd, n = pick.areas.size * pick.kinds.size, cap = Number(ov?.settings?.capUsd ?? 25);
    return { n, per, usd: n * per, cap, fits: Math.max(0, Math.floor(cap / per)), measured: dc.measured };
  }
  function picker(first, est) {
    const kinds = ov?.kinds || [];
    const over = est.usd > est.cap;
    return `<div class="acard"><div class="sh"><h3>${first ? "Start your first audit" : "New audit"}</h3><span class="meta">tests the latest saved version on the test copy</span></div>
      <div class="meta" style="margin-bottom:6px">Which parts</div>
      <div class="chips">${(ov?.areas || []).map((a) => `<button class="achip" data-pa="${esc(a)}" aria-pressed="${pick.areas.has(a)}">${esc(a)}</button>`).join("")}</div>
      <div class="meta" style="margin:12px 0 6px">What to check (most valuable first)</div>
      <div class="chips">${kinds.map((k) => `<button class="achip" data-pk="${esc(k.id)}" aria-pressed="${pick.kinds.has(k.id)}">${esc(k.label)}</button>`).join("")}</div>
      <div class="meta" style="margin:12px 0 6px">How deep</div>
      <div class="chips" role="group" aria-label="How deep">${DEPTHS.map(([k, l]) => `<button class="achip" data-pd="${k}" aria-pressed="${depthNow() === k}">${l}</button>`).join("")}</div>
      <p class="meta" style="margin:6px 0 0">${esc((DEPTHS.find((x) => x[0] === depthNow()) || [])[2] || "")}. Who audits is decided on the AI &amp; limits view.</p>
      <p class="estimate ${over ? "no" : ""}">${est.n ? `${plural(est.n, "square")} · about <b class="num">${usd(est.usd)}</b> (<span class="num">${usd(est.per)}</span> each, ${est.measured ? "measured" : "estimated from other depths"}) · your limit <span class="num">${usd(est.cap)}</span>${over ? ` — it will stop after about ${plural(est.fits, "square")}, most valuable first` : ""}` : "Pick at least one part and one kind of check."}
        <br><span class="meta">Screenshots of every screen and the customer journeys are included at no AI cost.</span></p>
      <div class="acts"><button class="abtn go" data-run="start">Start audit</button><button class="abtn" data-pickopen="0">Cancel</button></div>
      <div class="said" id="audStartSaid" role="status"></div></div>`;
  }
  function wireNow(p, run) {
    p.querySelectorAll("[data-goto]").forEach((b) => b.onclick = () => { if (b.dataset.goto === "findings") { stFilter = "waiting"; runFilter = null; } go(b.dataset.goto); });
    p.querySelectorAll("[data-pickopen]").forEach((b) => b.onclick = () => { picking = b.dataset.pickopen === "1"; paintNow(); });
    p.querySelectorAll("[data-pa]").forEach((b) => b.onclick = () => { const s = pick.areas; s.has(b.dataset.pa) ? s.delete(b.dataset.pa) : s.add(b.dataset.pa); paintNow(); });
    p.querySelectorAll("[data-pd]").forEach((b) => b.onclick = () => { pick.depth = b.dataset.pd; paintNow(); });
    p.querySelectorAll("[data-pk]").forEach((b) => b.onclick = () => { const s = pick.kinds; s.has(b.dataset.pk) ? s.delete(b.dataset.pk) : s.add(b.dataset.pk); paintNow(); });
    p.querySelectorAll("[data-run]").forEach((b) => b.onclick = () => control(b.dataset.run, b));
    p.querySelectorAll("[data-ask]").forEach((b) => b.onclick = async () => {
      const said = document.getElementById("audRunSaid") || document.getElementById("audStartSaid"); b.disabled = true;
      try { const j = await post("/api/audit/ask", { run: b.dataset.ask }); b.insertAdjacentHTML("afterend", `<span class="meta" style="align-self:center">${esc(j.said || "")}</span>`); }
      catch { if (said) said.textContent = "Could not reach the Control Room."; }
      b.disabled = false;
    });
    p.querySelectorAll("[data-cell]").forEach((b) => b.onclick = () => { openCell = openCell === b.dataset.cell ? null : b.dataset.cell; paintNow(); });
    if (openCell) paintCell(openCell);
    if (run) paintFeed(run.id);
  }
  async function control(what, b) {
    // Stop asks twice (no browser dialogs in the Control Room window): the first press arms it for 4 seconds
    if (what === "stop" && stopArmed < Date.now()) { stopArmed = Date.now() + 4000; paintNow(); setTimeout(() => { if (stopArmed && stopArmed < Date.now()) { stopArmed = 0; paintNow(); } }, 4100); return; }
    stopArmed = 0;
    const said = document.getElementById(what === "start" ? "audStartSaid" : "audRunSaid");
    if (what === "start" && (!pick.areas.size || !pick.kinds.size)) { if (said) said.textContent = "Pick at least one part and one kind of check."; return; }
    b.disabled = true; if (said) said.textContent = what === "start" ? "Getting the test copy ready (about a minute)…" : "…";
    try {
      const d = await post(`/api/audit/${what}`, what === "start" ? { areas: [...pick.areas], kinds: [...pick.kinds], depth: depthNow() } : {});
      if (what === "start" && d.ok) picking = false;
      await load(); paintNow();
      const s2 = document.getElementById(what === "start" && !d.ok ? "audStartSaid" : "audRunSaid");
      if (s2) s2.textContent = d.said || "";
    } catch { if (said) said.textContent = "Could not reach the Control Room."; b.disabled = false; }
  }
  async function paintCell(id) {
    const el = document.getElementById("audCell"); if (!el) return;
    el.hidden = false; el.textContent = "Loading…";
    try {
      const d = await get(`/api/audit/cell?id=${encodeURIComponent(id)}`);
      const k = ov.kinds.find((x) => x.id === d.cell.kind)?.label || d.cell.kind;
      el.innerHTML = `<b>${esc(d.cell.area)} × ${esc(k)}</b> · <span class="meta">${esc(d.cell.status)}${d.cell.model ? " · " + esc(MODEL(d.cell.model)) : ""} · ${usd(d.cell.cost_usd)}</span>
        ${d.cell.summary ? `<p style="margin:6px 0 0">${esc(d.cell.summary)}</p>` : ""}
        ${d.findings.length ? `<ul class="feed" style="margin-top:8px">${d.findings.map((f) => `<li><span class="num">${esc(f.id)}</span><span>${esc(f.title)}</span></li>`).join("")}</ul>` : ""}
        ${d.evidence.length ? `<div class="ev">${d.evidence.map(evChip).join("")}</div>` : ""}`;
    } catch { el.textContent = "Could not load this square."; }
  }
  async function paintFeed(runId) {
    try {
      const d = await get(`/api/audit/events?run=${encodeURIComponent(runId)}`);
      const el = document.getElementById("audFeed"); if (!el) return;
      const ev = d.events.slice(-8).reverse();
      el.innerHTML = ev.length ? ev.map((e) => `<li class="${e.kind === "warn" || e.kind === "fail" ? "no" : ""}"><time>${esc(new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()))}</time><span>${esc(plainStep(e.text))}</span></li>`).join("")
        : `<li class="meta">Nothing yet.</li>`;
    } catch {}
  }
  // the last two parts of a path fit on a phone; the full path is in the tooltip
  const fileChip = (x) => `<span title="${esc(x)}">${esc(String(x).split("/").slice(-2).join("/"))}</span>`;
  const evChip = (e) => e.kind === "shot"
    ? `<a href="/audit/evidence/${encodeURI(e.ref)}" target="_blank" rel="noopener">${esc(e.detail || e.ref.split("/").pop())}</a>`
    : `<span title="${esc(e.kind)}">${esc(e.ref)}</span>`;

  // ── FINDINGS (every run) ───────────────────────────────────────────────
  function recheckNote(f) {
    const r = f.second_check?.recheck;
    if (!r) return "";
    if (r.at && r.fixed === false) return `<span class="tag bad">Ticked on the roadmap, but NOT fixed</span>`;
    if (!r.at && r.tries) return `<span class="tag">re-check could not run; trying again</span>`;
    return "";
  }
  function paintFindings() {
    const p = panel("findings");
    const pool = { waiting: WAITING, sent: SENT, closed: CLOSED }[stFilter];
    const base = runFilter ? all.filter((f) => f.run_id === runFilter) : all;
    const shown = base.filter((f) => pool.includes(f.status) && (sevFilter === "all" || f.severity === sevFilter))
      .sort((a, b) => Object.keys(SEV).indexOf(a.severity) - Object.keys(SEV).indexOf(b.severity));
    const count = (pred) => base.filter((f) => pool.includes(f.status) && pred(f)).length;
    const run = runFilter ? (ov?.runs || []).find((r) => r.id === runFilter) : null;
    p.innerHTML = `
      ${run ? `<div class="chips"><button class="achip" data-runclear="1" aria-pressed="true">Only run ${run.n}: ${esc(run.title)} ✕</button></div>` : ""}
      <div class="chips" role="group" aria-label="Which findings">
        ${[["waiting", "Waiting for you"], ["sent", "Sent to GitHub"], ["closed", "Closed"]].map(([k, l]) =>
          `<button class="achip" data-st="${k}" aria-pressed="${stFilter === k}">${l} <span class="num">${base.filter((f) => ({ waiting: WAITING, sent: SENT, closed: CLOSED })[k].includes(f.status)).length}</span></button>`).join("")}
      </div>
      <div class="chips" role="group" aria-label="How serious">
        <button class="achip" data-sev="all" aria-pressed="${sevFilter === "all"}">All <span class="num">${count(() => true)}</span></button>
        ${Object.entries(SEV).map(([k, l]) => `<button class="achip" data-sev="${k}" aria-pressed="${sevFilter === k}">${l} <span class="num">${count((f) => f.severity === k)}</span></button>`).join("")}
      </div>
      ${stFilter === "sent" ? `<div class="acts"><button class="abtn sm" data-recheck="1">Re-check what the belt ticked</button><span class="said" id="audRecheckSaid" role="status"></span></div>` : ""}
      <div id="audFinds">${shown.length ? shown.map(findCard).join("") : `<div class="acard empty">${stFilter === "waiting" ? "Nothing is waiting for you." : "Nothing here."}</div>`}</div>`;
    p.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => { stFilter = b.dataset.st; paintFindings(); });
    p.querySelectorAll("[data-sev]").forEach((b) => b.onclick = () => { sevFilter = b.dataset.sev; paintFindings(); });
    p.querySelectorAll("[data-runclear]").forEach((b) => b.onclick = () => { runFilter = null; paintFindings(); });
    p.querySelectorAll("[data-act]").forEach((b) => b.onclick = () => act(b));
    p.querySelectorAll("[data-more]").forEach((b) => b.onclick = () => more(b));
    p.querySelectorAll("[data-recheck]").forEach((b) => b.onclick = async () => {
      const said = document.getElementById("audRecheckSaid"); b.disabled = true; said.textContent = "…";
      try { const j = await post("/api/audit/recheck"); said.textContent = j.said || ""; } catch { said.textContent = "Could not reach the Control Room."; }
      b.disabled = false;
    });
  }
  function findCard(f) {
    const sc = f.second_check?.verdict;
    const pipe = SENT.includes(f.status) ? `<div class="sent" style="border:0;padding:8px 0 0"><span class="num">${esc(f.roadmap_id || "")}</span>
      <span class="s">${{ sent: "on the roadmap, waiting for the belt", fixed: "the belt ticked it; the audit is re-checking", rechecked: "re-checked: the problem is gone ✓" }[f.status]}</span>
      <span class="pipe" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= { sent: 1, fixed: 3, rechecked: 4 }[f.status] ? "d" : i === { sent: 2, fixed: 4 }[f.status] ? "w" : ""}"></i>`).join("")}</span></div>` : "";
    // a screenshot or a journey cannot be "dug into" by an AI: it is measured again instead
    const canDig = !["capture", "journey"].includes(f.finder_role);
    return `<article class="find sev-${esc(f.severity)}" data-id="${esc(f.id)}">
      <div class="tags"><span class="tag sev">${SEV[f.severity] || esc(f.severity)}</span>${(f.areas || []).map((a) => `<span class="tag">${esc(a)}</span>`).join("")}
        <span class="tag ${sc === "confirmed" ? "good" : sc === "rejected" ? "bad" : ""}">${esc(STATUS[f.status] || f.status)}</span>${recheckNote(f)}<span class="tag num">${esc(f.id)}</span>${(f.second_check?.related || []).map((r) => `<span class="tag" title="Same cause or same code as this roadmap item">related ${esc(r)}</span>`).join("")}</div>
      <h4>${esc(f.title)}</h4>${f.observed ? `<p>${esc(f.observed)}</p>` : ""}
      <div class="ev" data-ev="${esc(f.id)}">${(f.files || []).map(fileChip).join("")}</div>
      ${pipe}
      <div class="acts">${WAITING.includes(f.status) ? `
        <button class="abtn go sm" data-act="send" data-id="${esc(f.id)}">Create GitHub issue</button>
        <button class="abtn sm" data-act="dismiss" data-id="${esc(f.id)}">Not a problem</button>
        ${canDig ? `<button class="abtn sm" data-act="dig" data-id="${esc(f.id)}">Dig deeper</button>` : ""}
        <button class="abtn sm" data-act="talk" data-id="${esc(f.id)}">Talk it over</button>`
        : f.status === "dismissed" ? `<button class="abtn sm" data-act="undo" data-id="${esc(f.id)}">Put it back</button>` : ""}
        <button class="abtn sm" data-more="${esc(f.id)}" aria-expanded="false">Evidence</button></div>
      <div class="said" role="status"></div></article>`;
  }
  async function more(b) {
    const box = root().querySelector(`[data-ev="${CSS.escape(b.dataset.more)}"]`);
    if (b.getAttribute("aria-expanded") === "true") { b.setAttribute("aria-expanded", "false"); paintFindings(); return; }
    b.setAttribute("aria-expanded", "true");
    try {
      const d = await get(`/api/audit/finding?id=${encodeURIComponent(b.dataset.more)}`);
      const f = d.finding;
      const shots = d.evidence.filter((e) => e.kind === "shot");
      box.innerHTML = [...(f.files || []).map(fileChip), ...d.evidence.filter((e) => e.kind !== "shot").map(evChip)].join("") || (shots.length ? "" : `<span>no evidence recorded</span>`);
      if (shots.length) box.insertAdjacentHTML("afterend", `<div class="shots mini">${shots.map(shotTile).join("")}</div>`);
      if (f.second_check?.why) box.insertAdjacentHTML("afterend", `<p class="meta" style="margin-top:6px">Second check (${esc(MODEL(f.second_check.by))}): ${esc(f.second_check.why)}</p>`);
    } catch { box.innerHTML = "<span>could not load evidence</span>"; }
  }
  async function act(b) {
    const card = b.closest(".find"), said = card.querySelector(".said");
    b.disabled = true; said.textContent = "…";
    try {
      const d = await post("/api/audit/act", { id: b.dataset.id, action: b.dataset.act });
      said.textContent = d.said || (d.ok ? "Done." : "That did not work.");
      if (d.ok) { await load(); paintFindings(); }
    } catch { said.textContent = "Could not reach the Control Room."; }
    b.disabled = false;
  }

  // ── EVIDENCE: screens grouped, problems first ──────────────────────────
  const shotTile = (x) => `<a class="shot" href="/audit/evidence/${encodeURI(x.ref)}" target="_blank" rel="noopener">
    <img src="/audit/evidence/${encodeURI(x.ref)}" alt="${esc(x.detail || x.ref)}" loading="lazy" onerror="this.outerHTML='<div class=ph>picture not saved</div>'"><span>${esc((String(x.detail || "").match(/(\d+)px/) || [, "?"])[1])} px</span></a>`;
  async function paintEvidence() {
    const p = panel("evidence");
    p.innerHTML = `<div class="acard"><div class="sh"><h3>Screens</h3><span class="meta">phone, tablet and laptop side by side · screens with problems first</span></div><div id="audShots" class="empty">Loading…</div></div>
      <div class="acard"><div class="sh"><h3>Customer journeys</h3><span class="meta">real customer and detailer flows, checked end to end</span></div><div id="audJourneys" class="empty">Loading…</div></div>`;
    try {
      const [s, j] = await Promise.all([get(`/api/audit/shots${ov?.run ? "?run=" + encodeURIComponent(ov.run.id) : ""}`), get("/api/audit/journeys")]);
      const groups = new Map();
      for (const x of s.shots) {
        const m = String(x.detail || "").match(/^(\w+) (\S+) at (\d+)px$/);
        if (!m) continue;
        const key = `${m[1]} ${m[2]}`;
        (groups.get(key) || groups.set(key, { role: m[1], path: m[2], shots: [] }).get(key)).shots.push(x);
      }
      const bad = new Set(all.filter((f) => f.finder_role === "capture" && OPENF.includes(f.status)).map((f) => (f.repro || "").replace(/^Open (\S+) as (\w+).*/, "$2 $1")));
      const list = [...groups.entries()].sort((a, b) => (bad.has(b[0]) - bad.has(a[0])) || a[0].localeCompare(b[0]));
      const sh = document.getElementById("audShots");
      sh.className = list.length ? "" : "empty";
      sh.innerHTML = list.length ? list.map(([k, g]) => `<div class="shotgroup"><div class="meta"><b>${esc(g.path)}</b> · ${esc(g.role)}${bad.has(k) ? ' · <span class="no">has a problem</span>' : ""}</div>
        <div class="shots">${g.shots.sort((a, b) => Number((a.detail.match(/(\d+)px/) || [])[1]) - Number((b.detail.match(/(\d+)px/) || [])[1])).map(shotTile).join("")}</div></div>`).join("")
        : "No screenshots yet. Every audit takes one of each screen at three widths.";
      const jr = document.getElementById("audJourneys");
      jr.className = j.journeys.length ? "" : "empty";
      jr.innerHTML = j.journeys.length ? j.journeys.map((x) => { const r = x.last_result; const none = r && r.passed == null;
        return `<div class="jrow"><div><b>${esc(x.name)}</b>
        <div class="meta">${esc(x.area)}${r?.at ? " · last run " + esc(new Date(r.at).toLocaleDateString([], { month: "short", day: "numeric" })) : ""}</div></div>
        <span class="tag ${!r ? "" : none ? "warnt" : r.failed ? "bad" : "good"}">${!r ? "not run yet" : none ? "no result" : `${r.passed} passed${r.failed ? `, ${r.failed} failed` : ""}`}</span></div>`; }).join("")
        : "No journeys yet.";
    } catch { const sh = p.querySelector("#audShots"); if (sh) sh.textContent = "Could not load."; }
  }

  // ── READINESS ──────────────────────────────────────────────────────────
  async function paintReadiness() {
    const p = panel("readiness");
    p.innerHTML = `<div class="empty">Loading…</div>`;
    try {
      const d = ready = await get("/api/audit/readiness");
      const n = d.blockers.length;
      p.innerHTML = `<div class="launch ${n ? "no" : ""}">${launchLine()}
          ${d.before ? `<span class="meta" style="display:block;margin-top:4px">${d.before} more to fix before launch.</span>` : ""}</div>
        ${n ? `<div class="acard"><div class="sh"><h3>Launch blockers</h3></div><ul class="feed">${d.blockers.map((b) =>
          `<li><span class="num">${esc(b.id)}</span><span>${esc(b.title)}${b.roadmap_id ? ` <span class="meta">· roadmap ${esc(b.roadmap_id)}</span>` : ""}</span></li>`).join("")}</ul></div>` : ""}
        <div class="acard"><div class="sh"><h3>The live site</h3><span class="meta">checked after each publish · read only</span></div>
          ${d.live ? `<p style="margin:0 0 8px">${d.live.ok ? '<span class="ok">Looks right</span>' : '<span class="no">Has a problem</span>'} · checked
            ${esc(new Date(d.live.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()))}${!d.live.ok && !d.live.retried ? " · looking again in a few minutes" : ""}</p>
            <ul class="feed">${d.live.pages.filter((x) => x.width === 390 || !x.ok).map((x) => `<li><span class="${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "✗"}</span><span>${esc(x.what)}${x.ok ? "" : ` <span class="meta">· ${esc([...x.errors, ...x.failed].join(" | ") || "expected text missing")}</span>`}</span></li>`).join("")}</ul>`
            : `<div class="empty">Not checked yet. It runs by itself after your next publish.</div>`}
          <div class="acts"><button class="abtn sm" data-rd="livecheck">Check the live site now</button></div>
          <div class="said" id="audRdSaid" role="status"></div></div>
        <div class="two">
          <div class="acard"><div class="sh"><h3>How ready, part by part</h3><span class="meta">green passed · red failed · grey not tested</span></div>
            ${d.dimensions.map((x) => { const t = x.passed + x.failed + (x.unknown || 0);
              return `<div class="dim"><span>${esc(x.name)}</span>${t ? `<span class="bar" aria-hidden="true"><i class="p" style="width:${x.passed / t * 100}%"></i><i class="f" style="width:${x.failed / t * 100}%"></i><i class="u" style="width:${(x.unknown || 0) / t * 100}%"></i></span>
                <small><span class="num">${x.passed}</span> ok · <span class="num ${x.failed ? "no" : ""}">${x.failed}</span> failed${x.unknown ? ` · <span class="num">${x.unknown}</span> not tested` : ""}</small>`
                : `<span class="bar" aria-hidden="true"><i class="u" style="width:100%"></i></span><small>not tested yet</small>`}</div>`; }).join("")}</div>
          <div class="acard"><div class="sh"><h3>Outside services</h3></div>
            ${d.integrations.length ? d.integrations.map((x) => `<div class="integ"><span class="dot ${x.health === "ok" ? "ok" : x.health === "bad" ? "bad" : ""}"></span>
              <div><b>${esc(x.name)}</b><small>${esc(x.mode)}</small></div><span class="meta">${esc(x.covered || "")}</span></div>`).join("")
              : `<div class="empty">Found by the first audit.</div>`}</div>
        </div>`;
      p.querySelectorAll("[data-rd]").forEach((b) => b.onclick = async () => {
        const said = document.getElementById("audRdSaid"); b.disabled = true; said.textContent = "Opening the live site, read only… (about a minute)";
        try { const j = await post(`/api/audit/${b.dataset.rd}`); said.textContent = j.said || ""; if (j.ok) paintReadiness(); }
        catch { said.textContent = "Could not reach the Control Room."; }
        b.disabled = false;
      });
    } catch { p.innerHTML = `<div class="empty">Could not load.</div>`; }
  }

  // ── SYSTEM ─────────────────────────────────────────────────────────────
  async function paintSystem() {
    const p = panel("system");
    p.innerHTML = `<div class="empty">Loading…</div>`;
    try {
      const d = await get("/api/audit/map");
      const chk = d.checked || {};
      const label = { routes: "Screens", functions: "Server functions", tables: "Database tables", policies: "Access rules", services: "Outside services" };
      p.innerHTML = `<div class="acard"><div class="sh"><h3>What the product is made of</h3><span class="meta">counted from the code and the test database</span></div>
          ${Object.keys(chk).length ? `<table><tr><th>What</th><th>Sorted into a part</th><th>In total</th></tr>${Object.entries(chk).map(([k, [m, s]]) =>
            `<tr><td>${esc(label[k] || k)}</td><td class="num ${m === s ? "ok" : ""}">${m}</td><td class="num">${s}</td></tr>`).join("")}</table>
            <p class="meta" style="margin-top:8px">Things not sorted into a part are not in any auditor's starting list yet.</p>`
            : `<div class="empty">The first audit counts it.</div>`}</div>
        <div class="two">
          <div class="acard"><div class="sh"><h3>Parts</h3><span class="meta num">${d.total} pieces</span></div>
            ${d.areas.length ? `<table><tr><th>Part</th><th>Pieces</th><th class="hide-sm">What</th></tr>${d.areas.map((a) =>
              `<tr><td>${esc(a.area)}</td><td class="num">${a.total}</td><td class="hide-sm">${esc(Object.entries(a.types).map(([t, n]) => `${n} ${(PIECE[t] || [t, t + "s"])[n === 1 ? 0 : 1]}`).join(", "))}</td></tr>`).join("")}</table>` : `<div class="empty">Nothing counted yet.</div>`}</div>
          <div class="acard"><div class="sh"><h3>How things connect</h3></div>
            ${d.flows.length ? `<ul class="feed">${d.flows.map((f) => `<li><span class="tag">${esc(f.area)}</span><span>${esc(f.name)}</span></li>`).join("")}</ul>` : `<div class="empty">Not drawn yet.</div>`}</div>
        </div>`;
    } catch { p.innerHTML = `<div class="empty">Could not load.</div>`; }
  }

  // ── RUNS & COST ────────────────────────────────────────────────────────
  async function paintRuns() {
    const p = panel("runs");
    p.innerHTML = `<div class="empty">Loading…</div>`;
    try {
      const c = await get("/api/audit/costs");
      const runs = ov?.runs || [];
      const tbl = (rows, head) => rows.length ? `<table><tr>${head.join("")}</tr>${rows.join("")}</table>` : `<div class="empty">Nothing yet.</div>`;
      p.innerHTML = `<div class="acard"><div class="sh"><h3>Past runs</h3><span class="meta">tap one to see its findings</span></div>${tbl(runs.map((r) =>
          `<tr class="rowlink" data-openrun="${esc(r.id)}" tabindex="0"><td class="num">${r.n}</td><td>${esc(r.title)}<span class="meta" style="display:block">${esc(new Date(r.started_at || Date.now()).toLocaleDateString([], { month: "short", day: "numeric" }))} · ${esc(r.status)}</span></td><td class="num">${usd(r.cost_usd)}</td></tr>`),
          ["<th>Run</th>", "<th>What it checked</th>", "<th>Cost</th>"])}</div>
        <div class="two">
          <div class="acard"><div class="sh"><h3>Cost by auditor</h3></div>${tbl(c.byRole.map((x) => `<tr><td>${esc((ROLE[x.key] || [, x.key])[1])}</td><td class="num">${x.cells}</td><td class="num">${usd(x.usd)}</td></tr>`), ["<th>Auditor</th>", "<th>Jobs</th>", "<th>Cost</th>"])}</div>
          <div class="acard"><div class="sh"><h3>How often each AI was right</h3><span class="meta">measured on real findings</span></div>${tbl(c.accuracy.map((x) =>
            `<tr><td>${esc(MODEL(x.model))}</td><td class="num">${x.found}</td><td class="num ok">${x.upheld}</td><td class="num ${x.overturned ? "no" : ""}">${x.overturned}</td></tr>`), ["<th>AI</th>", "<th>Found</th>", "<th>Upheld</th>", "<th>Overturned</th>"])}</div>
        </div>`;
      p.querySelectorAll("[data-openrun]").forEach((tr) => tr.onclick = tr.onkeydown = (ev) => {
        if (ev.type === "keydown" && ev.key !== "Enter") return;
        runFilter = tr.dataset.openrun; stFilter = "waiting"; sevFilter = "all"; go("findings");
        const pool = { waiting: WAITING, sent: SENT, closed: CLOSED };
        if (!all.some((f) => f.run_id === runFilter && WAITING.includes(f.status))) { stFilter = all.some((f) => f.run_id === runFilter && SENT.includes(f.status)) ? "sent" : "closed"; paintFindings(); }
      });
    } catch { p.innerHTML = `<div class="empty">Could not load.</div>`; }
  }

  // ── AI & LIMITS: who has room, the chooser's decisions, and every audit setting ──
  // The settings are the main Settings page's own rows (same checks, same save); they are only shown here.
  const SUBS = [["ai", "Who audits", "Which AIs may audit, which goes first, and how deep audits usually go."],
    ["limits", "Usage limits: Claude and ChatGPT", "New audit work waits at these lines and carries on by itself when the window resets. No money limits: both are subscriptions."],
    ["plans", "Your plans", "The chooser and its planner read these dates."],
    ["fixed", "Always use one AI for a kind of check", "Leave on \"Let the chooser decide\" unless you want one AI for that kind every time."],
    ["notes", "What the AI planner knows", ""],
    ["", "How the audit runs", "Spending limit, how many work at once, the free nightly pass and the live-site check."]];
  let aiEdits = {}, aiRows = null, aiInfo = null;
  const pctBar = (v, stop) => v == null ? `<span class="ubar off" aria-hidden="true"></span><span class="meta">not known</span>`
    : `<span class="ubar ${v >= stop ? "hot" : ""}" role="img" aria-label="${v}% used"><i style="transform:scaleX(${Math.min(1, v / 100).toFixed(3)})"></i><b style="left:${stop}%"></b></span><span class="num">${v}%</span>`;
  const when = (ms) => ms ? new Date(ms).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()) : "";
  function aiControl(r) {
    const id = "aiset-" + r.path.replace(/\W+/g, "-"), cur = aiEdits[r.path] !== undefined ? aiEdits[r.path] : r.value;
    const p = esc(r.path), lab = `<label class="slab" for="${id}">${esc(r.label)}</label>`;
    const help = r.why ? `<p class="meta shelp">${esc(r.why)}</p>` : "";
    if (r.kind === "bool") return `<div class="srow"><span class="slab" id="${id}">${esc(r.label)}</span><div class="seg2" role="group" aria-labelledby="${id}">
      <button type="button" data-aiset="${p}" data-v="1" aria-pressed="${cur === true}">On</button><button type="button" data-aiset="${p}" data-v="0" aria-pressed="${cur === false}">Off</button></div>${help}</div>`;
    if (r.kind === "choice") return `<div class="srow">${lab}<select id="${id}" data-aiset="${p}">${(r.options || []).map((o) => `<option value="${esc(o.id)}"${o.id === cur ? " selected" : ""}>${esc(o.label)}${o.id === r.recommend ? " (recommended)" : ""}</option>`).join("")}</select>${help}</div>`;
    if (r.kind === "date") return `<div class="srow">${lab}<input id="${id}" type="date" data-aiset="${p}" value="${esc(cur || "")}">${help}</div>`;
    if (r.kind === "text") {
      const isNotes = r.path === "audit.ai.knowledge", shown = isNotes && !cur ? (aiInfo?.knowledgeDefault || "") : cur;
      return `<div class="srow wide">${lab}<textarea id="${id}" data-aiset="${p}" rows="${r.rows || 6}" spellcheck="true">${esc(shown)}</textarea>${help}
        ${isNotes ? `<div class="acts"><button type="button" class="abtn sm" data-aidefault="${p}">Put back the notes that came with it</button></div>` : ""}</div>`;
    }
    return `<div class="srow">${lab}<span class="numin"><input id="${id}" type="number" inputmode="decimal" data-aiset="${p}" value="${esc(cur)}"${r.min != null ? ` min="${r.min}"` : ""}${r.max != null ? ` max="${r.max}"` : ""} step="${r.step || 1}">${r.kind === "money" ? "<span>$</span>" : ""}</span>${help}</div>`;
  }
  async function paintAI() {
    const p = panel("ai");
    if (!aiRows) p.innerHTML = `<div class="empty">Loading…</div>`;
    try {
      const [st, sv] = await Promise.all([get("/api/audit/ai"), get("/api/settings")]);
      aiInfo = st; aiRows = ((sv.groups || []).find((g) => g.id === "audit") || { rows: [] }).rows;
      const stop = (p2, w) => Number((aiRows.find((r) => r.path === `audit.ai.${p2}Stop${w}`) || {}).value) || 100;
      // R5-P2-1: an expired Claude sign-in is said here too (it showed a green dot and "not known")
      const signIn = !!(window.__state || {}).claudeAuth, isClaude = (x) => /claude/i.test(String(x.provider || x.name || ""));
      const prov = st.providers.map((x) => `<div class="prov"><span class="dot ${x.ok && !(signIn && isClaude(x)) ? "ok" : "bad"}"></span><div><b>${esc(x.name)}</b><small>${esc(signIn && isClaude(x) ? "Claude sign-in expired — double-click LOGIN.cmd in the belt folder (or press Sign in again on Now)." : x.why)}</small>
            <div class="ug"><span class="meta">5 hours</span>${pctBar(x.fiveHour, stop(x.provider, "5h"))}<span class="meta">${x.resets?.fiveHour ? "resets " + esc(when(x.resets.fiveHour)) : ""}</span>
            <span class="meta">Week</span>${pctBar(x.week, stop(x.provider, "Week"))}<span class="meta">${x.resets?.week ? "resets " + esc(when(x.resets.week)) : ""}</span></div>
            <div class="meta">${x.at ? `reading from ${esc(new Date(x.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()))}${x.stale ? " (too old to trust: counted as not known)" : ""}` : "no reading yet: its next answer brings one"}</div></div></div>`).join("");
      const choices = (st.choices || []).slice(0, 12);
      const bySub = (s) => aiRows.filter((r) => (r.sub || "") === s);
      const dirty = Object.keys(aiEdits).length;
      p.innerHTML = `<div class="two">
          <div class="acard"><div class="sh"><h3>Who has room right now</h3><span class="meta">goes first now: ${esc(st.order.join(" → "))}</span></div>${prov}
            <p class="meta" style="margin-top:8px">The line on each bar is your stop. Claude's reading comes with each Claude answer; ChatGPT's is read every 90 seconds.</p></div>
          <div class="acard"><div class="sh"><h3>Last decisions</h3><span class="meta">who did what, and why</span></div>
            ${choices.length ? `<ul class="feed">${choices.map((c) => `<li><time>${esc(/* R7-P2-4: an older decision says its day ("Oct 23 · 7:57 am"), so it is not read as this morning's */ (new Date(c.at).toDateString() === new Date().toDateString() ? "" : new Date(c.at).toLocaleDateString([], { month: "short", day: "numeric" }) + " · ") + new Date(c.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?(AM|PM)\b/g, (x) => x.toLowerCase()))}</time><span><b>${esc(MODEL(c.model) || c.provider || "")}</b>${c.effort ? ` · ${esc(c.effort)}` : ""} · ${esc(plainStep(c.what))} <span class="meta">(run ${c.run}) ${esc(c.why)}</span></span></li>`).join("")}</ul>`
              : `<div class="empty">No audit has run with the chooser yet.</div>`}</div>
        </div>
        <form class="aiform" novalidate>${SUBS.map(([s, title, note]) => { const rows = bySub(s); return rows.length ? `<div class="acard"><div class="sh"><h3>${esc(title)}</h3></div>${note ? `<p class="meta" style="margin:-6px 0 10px">${esc(note)}</p>` : ""}<div class="sgrid">${rows.map(aiControl).join("")}</div></div>` : ""; }).join("")}
          <div class="savebar${dirty ? " dirty" : ""}"><span class="meta" role="status" id="aiSaid">${dirty ? `${plural(dirty, "unsaved change")}` : "Saved."}</span>
            <button type="button" class="abtn" data-aiundo="1" ${dirty ? "" : "disabled"}>Undo changes</button><button type="button" class="abtn go" data-aisave="1" ${dirty ? "" : "disabled"}>Save</button></div></form>`;
      wireAI(p);
    } catch { p.innerHTML = `<div class="acard empty">Could not load. Reload the Control Room.</div>`; }
  }
  function wireAI(p) {
    const rowOf = (path) => aiRows.find((r) => r.path === path);
    const mark = (path, v) => {
      const r = rowOf(path), base = r.path === "audit.ai.knowledge" && !r.value ? (aiInfo?.knowledgeDefault || "") : r.value;
      if (JSON.stringify(v) === JSON.stringify(base)) delete aiEdits[path]; else aiEdits[path] = v;
      const n = Object.keys(aiEdits).length, said = document.getElementById("aiSaid");
      if (said) said.textContent = n ? plural(n, "unsaved change") : "Saved.";
      p.querySelectorAll("[data-aisave],[data-aiundo]").forEach((b) => b.disabled = !n);
      p.querySelector(".savebar")?.classList.toggle("dirty", !!n);
    };
    p.querySelectorAll("button[data-aiset]").forEach((b) => b.onclick = () => {
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      mark(b.dataset.aiset, b.dataset.v === "1");
    });
    p.querySelectorAll("select[data-aiset],input[data-aiset],textarea[data-aiset]").forEach((el) => el.oninput = el.onchange = () => {
      const r = rowOf(el.dataset.aiset);
      mark(r.path, r.kind === "int" || r.kind === "money" ? (el.value === "" ? "" : Number(el.value)) : el.value);
    });
    // the shipped notes back in the box; saving them is saved as "use the shipped notes" (see Save)
    p.querySelectorAll("[data-aidefault]").forEach((b) => b.onclick = () => { const ta = p.querySelector(`textarea[data-aiset="${CSS.escape(b.dataset.aidefault)}"]`); if (ta) { ta.value = aiInfo?.knowledgeDefault || ""; mark(b.dataset.aidefault, ta.value); } });
    p.querySelectorAll("[data-aiundo]").forEach((b) => b.onclick = () => { aiEdits = {}; paintAI(); });
    p.querySelectorAll("[data-aisave]").forEach((b) => b.onclick = async () => {
      const said = document.getElementById("aiSaid"); b.disabled = true; said.textContent = "Saving…";
      // the planner's notes: saving the text that came with it is the same as "use the notes that came with it"
      const changes = { ...aiEdits };
      if (changes["audit.ai.knowledge"] !== undefined && changes["audit.ai.knowledge"].trim() === (aiInfo?.knowledgeDefault || "").trim()) changes["audit.ai.knowledge"] = "";
      try {
        const j = await post("/api/settings", { changes });
        if (j.ok) { aiEdits = {}; await paintAI(); const s2 = document.getElementById("aiSaid"); if (s2) s2.textContent = j.said || "Saved."; await load().catch(() => {}); }
        else { said.textContent = j.said || "Not saved."; b.disabled = false; }
      } catch { said.textContent = "Could not reach the Control Room."; b.disabled = false; }
    });
  }

  // ── load + paint + poll ────────────────────────────────────────────────
  function badge() {
    const waiting = all.filter((f) => WAITING.includes(f.status)).length;
    for (const pip of document.querySelectorAll('#audPip, [data-pip="audit"]')) { pip.hidden = !waiting; pip.textContent = waiting; }
    window.__audit = { waiting, blockers: ready && Array.isArray(ready.blockers) ? ready.blockers.length : null };
  }
  async function load() {
    ov = await get("/api/audit/overview");
    all = (await get("/api/audit/findings?all=1")).all || [];
    runFindings = ov.run ? all.filter((f) => f.run_id === ov.run.id) : [];
    if (view === "now" || NXA()) ready = await get("/api/audit/readiness").catch(() => ready);
    badge();
  }
  function paint() {
    if (NXA() && view !== "now") paintNow();
    ({ now: paintNow, findings: paintFindings, evidence: paintEvidence, readiness: paintReadiness, system: paintSystem, runs: paintRuns, ai: paintAI })[view]();
  }
  window.auditPaint = async () => {
    shell();
    try { await load(); } catch { panel(view).innerHTML = `<div class="acard empty">The audit is not answering. Reload the Control Room.</div>`; return; }
    paint();
    clearInterval(timer);
    timer = setInterval(async () => {
      if (root().hidden || document.hidden) return;
      if ((view !== "now" && !NXA()) || !ov?.run || !["running", "paused", "waiting"].includes(ov.run.status)) return;
      try { await load(); paintNow(); } catch {}
    }, 4000);
  };
  // the badge on the Audit tab itself, even when another tab is open (review: on his phone he would not know)
  // P1-6 (audit 2026-11-05): the launch blockers too, so Now can say "Not ready to launch: 17 launch blockers"
  const tick = async () => { if (document.hidden) return; try { const d = await get("/api/audit/findings?all=1"); all = d.all || all; ready = await get("/api/audit/readiness").catch(() => ready); badge(); } catch {} };
  setTimeout(tick, 3000); setInterval(tick, 60000);
})();
