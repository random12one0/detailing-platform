// SAMPLE DATA for the Audit tab — used by the preview and by ui-check.mjs so
// every view is drawn and measured with realistic content (long titles, all
// severities, every cell state) before the engine produces real runs.
// Every run it writes is titled "SAMPLE" so it can never be mistaken for one.
//
//   node audit-fixture.mjs <file.db>

import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync, crc32 } from "node:zlib";

// A real (tiny, generated) phone-shaped PNG so the Evidence view shows a picture, not a 404.
function samplePng(w = 90, h = 160) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; const band = y > 120 && y < 134; raw[o] = band ? 56 : 17 + y / 8; raw[o + 1] = band ? 224 : 20 + y / 8; raw[o + 2] = band ? 139 : 23 + y / 8; } }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
import { openStore, AREAS, KINDS } from "./audit-store.mjs";

export function writeFixture(file) {
  rmSync(file, { force: true }); rmSync(file + "-wal", { force: true }); rmSync(file + "-shm", { force: true });
  const s = openStore(file);
  const old = s.newRun({ title: "SAMPLE · Security, code, product", scope: { areas: AREAS }, kinds: KINDS.map((k) => k.id), git_sha: "3501cde" });
  s.setRun(old.id, { status: "done", started_at: "2026-10-14T09:00:00Z", ended_at: "2026-10-14T13:12:00Z", cost_usd: 11.4 });
  const r = s.newRun({ title: "SAMPLE · Booking, Money & Sign-up", scope: { areas: ["Booking", "Money", "Sign-up"] }, kinds: KINDS.map((k) => k.id), git_sha: "aecd935", cap_usd: 20 });
  s.setRun(r.id, { status: "running", started_at: new Date(Date.now() - 41 * 60000).toISOString(), cost_usd: 7.61 });

  const plan = { Booking: ["clean", "findings", "clean", "findings", "clean", "findings"], Money: ["findings", "clean", "findings", "clean", "findings", "running"], "Sign-up": ["clean", "findings", "findings", "running", "todo", "todo"] };
  const model = { code: "opus", looks: "claude-sonnet-5-5", security: "opus", backend: "opus", integrations: "claude-sonnet-5-5", product: "opus" };
  for (const area of AREAS) for (const k of KINDS) {
    const id = s.addCell({ run_id: r.id, area, kind: k.id, role: k.id, model: model[k.id] });
    const st = plan[area]?.[KINDS.indexOf(k)] || "todo";
    s.setCell(id, { status: st, cost_usd: st === "todo" ? 0 : 0.2 + (area.length % 5) * 0.11, summary: st === "clean" ? "Checked; nothing wrong found." : null,
      step: st === "running" ? { looks: "check-page /app?plan=pro at 390x844", integrations: "calling stripe-webhook twice with the same event", backend: "comparing bookings.start_at with the slot the customer picked" }[k.id] || "reading code" : null });
  }
  const F = [
    ["Money", "security", "defect", "blocker", "confirmed", "A discount code can be applied by someone who is not signed in",
      "The apply-discount function answers a caller with no sign-in, so anyone can test codes against any business.",
      ["supabase/functions/validate-promo-code/index.ts:41"], "opus", [["file", "validate-promo-code/index.ts:41"], ["test", "unauth-call.json"], ["note", "reproduced 3 of 3"]]],
    ["Booking", "backend", "defect", "blocker", "confirmed", "Two customers can book the same 9:00 slot if they press within a second",
      "Two bookings made at the same moment were both saved; the slot check and the save are not one step.",
      ["supabase/functions/create-booking/index.ts:212"], "opus", [["file", "create-booking/index.ts:212"], ["test", "race-2x.json"], ["db", "2 rows, same start_at"]]],
    ["Sign-up", "looks", "defect", "before", "probable", "On a phone, the plan total is hidden behind the keyboard on step 2 while the business name is being typed, so the person cannot see what they are agreeing to pay",
      "At 390x844 the total and Continue sit under the keyboard while typing the business name.",
      ["app/src/pages/Signup.jsx"], "claude-sonnet-5-5", [["shot", "run-2/signup-390-step2.png"], ["note", "check-page: 0 overflow, 1 hidden"]]],
    ["Money", "integrations", "defect", "before", "confirmed", "The same Stripe event delivered twice marks a deposit paid twice",
      "Replaying payment_intent.succeeded wrote two payment rows for one deposit.", ["supabase/functions/stripe-webhook/index.ts:88"], "claude-sonnet-5-5", [["test", "webhook-replay.json"]]],
    ["Booking", "product", "opportunity", "idea", "probable", "Let customers add a second vehicle in the same booking",
      "Families book two cars back to back today: two bookings, two emails, two deposits.", [], "opus", [["note", "3 of 5 competitor sites offer it"]]],
    ["Booking", "looks", "improvement", "after", "probable", "The time list jumps when the weather strip loads", "Layout shift of 64px on step 4 at 390.", ["app/src/book/StepTime.jsx"], "claude-sonnet-5-5", [["timing", "CLS 0.21"]]],
    ["Money", "code", "debt", "after", "rejected", "Two money formatters", "Second check: only one exists; the other is a re-export.", [], "gpt-6.1-sol", []],
    ["Sign-up", "security", "defect", "blocker", "sent", "A new account gets a working booking page before paying", "Matches roadmap 97.37's ruling.", [], "opus", []],
    ["Booking", "code", "defect", "before", "rechecked", "Reschedule leaves the old time blocked", "Fixed by the belt; re-checked by the audit.", [], "opus", []],
  ];
  for (const [area, kind, category, severity, status, title, observed, files, m, ev] of F) {
    const id = s.addFinding({ run_id: r.id, cell_id: `${r.id}:${area}:${kind}`, category, severity, status, title, observed, files, areas: [area],
      finder_role: kind, finder_model: m, confidence: status === "confirmed" ? "high" : "medium",
      second_check: status === "rejected" ? { verdict: "rejected", by: "claude-sonnet-5-5", why: "could not reproduce" } : { verdict: status === "probable" ? "probable" : "confirmed", by: m === "opus" ? "claude-sonnet-5-5" : "gpt-6.1-sol" },
      roadmap_id: status === "sent" ? "100.3" : status === "rechecked" ? "100.1" : null, cost_usd: 0.4 });
    for (const [kind2, ref] of ev) s.addEvidence({ run_id: r.id, finding_id: id, cell_id: `${r.id}:${area}:${kind}`, kind: kind2, ref });
  }
  const steps = [["looks", "Opened /app?plan=pro at 390x844"], ["security", "grep callers of validate-promo-code (4 found)"], ["security", "test project: call without sign-in → 200"],
    ["integrations", "replaying payment_intent.succeeded"], ["backend", "two bookings at 09:00 sent together"], ["looks", "screenshot saved: signup-390-step2.png"]];
  for (const [k, t] of steps) s.event(r.id, `${r.id}:Money:${k}`, "step", t);
  const shotDir = path.join(path.dirname(file), "evidence", r.id); mkdirSync(shotDir, { recursive: true });
  for (const name of ["signup-390-step2.png", "book-390-step4.png", "today-1440.png"]) {
    writeFileSync(path.join(shotDir, name), samplePng());
    if (name !== "signup-390-step2.png") s.addEvidence({ run_id: r.id, kind: "shot", ref: `${r.id}/${name}`, detail: name });
  }
  s.set("bench", { caught: 17, of: 20, at: "2026-10-15T08:00:00Z" });
  s.set("publish", { ready: false, sha: "aecd935", blockers: 2, at: new Date().toISOString() });
  s.set("dimensions", {
    "Functional correctness": { tested: 41, passed: 38, failed: 3, unknown: 6 }, "Data integrity": { tested: 12, passed: 11, failed: 1, unknown: 4 },
    "Security": { tested: 18, passed: 16, failed: 2, unknown: 9 }, "Integrations": { tested: 7, passed: 6, failed: 1, unknown: 5 },
    "Visual quality": { tested: 66, passed: 61, failed: 5, unknown: 0 }, "Accessibility": { tested: 22, passed: 22, failed: 0, unknown: 3 },
  });
  s.set("integrations", [
    { name: "Stripe", mode: "sandbox", health: "ok", features: ["Deposits", "Subscriptions", "Connect"], covered: "6 of 9 events" },
    { name: "Resend (email)", mode: "recorded only", health: "ok", features: ["Confirmations", "Reminders", "Invoices"], covered: "content checked, no sends" },
    { name: "Geoapify (addresses)", mode: "not set up on staging", health: "unknown", features: ["Address search"], covered: "0" },
    { name: "Weather", mode: "live API", health: "ok", features: ["Job forecast"], covered: "1 of 2" },
    { name: "Cloudflare R2 (photos)", mode: "not set up on staging", health: "unknown", features: ["Job photos", "Receipts"], covered: "0" },
  ]);
  for (const [area, type, name] of [["Booking", "route", "/book/:slug"], ["Booking", "function", "create-booking"], ["Booking", "function", "available-slots"], ["Booking", "table", "bookings"],
    ["Money", "function", "stripe-webhook"], ["Money", "table", "payments"], ["Sign-up", "route", "/app"], ["Booking", "flow", "Customer books → create-booking → bookings → email_sends → Today"]])
    s.putMapItem({ id: `${type}:${name}`, area, type, name });
  s.set("mapCheck", { routes: [52, 52], functions: [49, 49], tables: [58, 58], policies: [210, 212] });
  s.putJourney({ id: "book-full-detail", name: "Customer books a full detail", area: "Booking", steps: ["open site", "pick service", "pick time", "details", "confirm"], source: "library" });
  s.setJourney("book-full-detail", { last_result: { passed: 43, failed: 1, at: "2026-10-15T15:10:00Z" } });
  s.putJourney({ id: "two-customers-race", name: "Two customers race for one slot", area: "Booking", steps: ["two browsers", "same slot", "submit together"], source: "library" });
  s.close();
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  writeFixture(process.argv[2] || "data/audit/sample.db");
  console.log("sample audit database written");
}
