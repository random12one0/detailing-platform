// TURN A DETAILER'S ANSWERS INTO THE BRIEF YOU HAND THE AGENT.
//
// His workflow, 2026-09-10, in his own words:
//
//   *"As soon as someone submits a form, I get an application or something,
//    and then I can just open up Claude Code and go to my website builder
//    agent and just be like, hey, new intake form, start building the
//    website, and it automatically kinda knows what to do."*
//
// **THE FORM COLLECTED AND NOTHING DELIVERED.** Submitting wrote one row to
// `site_intake` and stopped there: no email, nothing readable in the back
// office, and nothing an agent could be pointed at. This is the third of those
// and the one that makes the workflow work, because it needs no deploy and no
// third party — it reads the row and writes a file.
//
//   node --env-file=.env scripts/site-brief.mjs demo-detail
//   node --env-file=.env scripts/site-brief.mjs --all
//
// Writes `docs/clients/<slug>-brief.md`. That path is what
// `docs/tenant-site-kit.md` § 5 already tells an agent to read, so the file
// lands where the process already looks rather than inventing a second place.
//
// **THE QUESTIONS COME FROM THE PRODUCT'S OWN FILE, NEVER A COPY.**
// `app/src/lib/siteIntake.js` has no imports of any kind — the same discipline
// `book/core.js` keeps — so this imports it directly. A second list of
// questions here would go stale the first time a question was reworded, and
// the brief would print an old question above a new answer, which is worse
// than printing nothing.
//
// **AND AN UNANSWERED QUESTION IS PRINTED AS UNANSWERED.** Silently dropping
// blanks would let an agent read a brief and think it was complete, and the
// one rule on the other side of this form is that nothing on the finished site
// may claim anything the detailer did not establish. A blank is a fact.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { EXAMPLES, STEPS } from "../app/src/lib/siteIntake.js";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const ROOT = fileURLToPath(new URL("../", import.meta.url));

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const wanted = args.filter((a) => !a.startsWith("--"));
if (!ALL && wanted.length === 0) {
  console.error("Usage: site-brief.mjs <slug> [<slug>…]  |  --all");
  process.exit(1);
}

const get = async (p) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p} → ${r.status} ${await r.text()}`);
  return r.json();
};

// ── formatting one answer ───────────────────────────────────────────────────
// Every shape the form can produce, and a named fallback rather than
// `[object Object]` if a new one ever appears.
const fmt = (v) => {
  if (v === undefined || v === null || v === "") return null;
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (typeof v === "object") return null;   // handled by the callers that know the shape
  return String(v).trim() || null;
};

const looked = (a, n) => {
  const r = a[`look${n}`];
  if (!r?.verdict) return "— not answered";
  const word = { yes: "LIKED IT", no: "NOT FOR THEM", meh: "no strong feeling" }[r.verdict] ?? r.verdict;
  const bits = [word];
  if (r.chips?.length) bits.push(r.chips.join(", "));
  if (r.note?.trim()) bits.push(`“${r.note.trim()}”`);
  return bits.join(" · ");
};

function brief(biz, row) {
  const a = row?.answers ?? {};
  const out = [];
  const say = (l = "") => out.push(l);

  say(`# ${biz.name} — website brief`);
  say();
  say(`Slug \`${biz.slug}\`. ${row?.submitted_at
    ? `**Sent ${new Date(row.submitted_at).toISOString().slice(0, 10)}.**`
    : "**NOT SENT — this is a part-finished draft.**"}`);
  say();
  if (a.oldsite?.trim()) {
    say(`**They already have a site: ${a.oldsite.trim()}**`);
    say();
    say("Questions marked *on their website* are answered there — read it rather than asking again.");
    say();
  }
  say("Read `docs/tenant-site-kit.md` before building. The rule that outranks");
  say("everything here: **nothing on the finished site may claim anything this");
  say("brief does not establish.** A blank below is a blank, not permission.");
  say();
  say("---");

  // ── what they thought of our example sites ────────────────────────────────
  say();
  say("## What they made of our sites");
  say();
  for (const [href, name, note] of EXAMPLES) {
    const n = EXAMPLES.findIndex((e) => e[0] === href) + 1;
    say(`- **${name}** (\`${href}\` — ${note})  \n  ${looked(a, n)}`);
  }
  const others = Array.isArray(a.others) ? a.others.filter((r) => r.url?.trim()) : [];
  if (others.length) {
    say();
    say("### Sites they brought us");
    say();
    for (const r of others) {
      const verdict = r.verdict === "no" ? "DISLIKES" : r.verdict === "yes" ? "LIKES" : "—";
      say(`- ${verdict} ${r.url.trim()}${r.why?.trim() ? ` — “${r.why.trim()}”` : ""}`);
    }
  }

  // ── every question, in the order they were asked ──────────────────────────
  let unanswered = 0;
  for (const step of STEPS) {
    const rows = [];

    if (step.kind === "either") {
      for (const [id, question, left, right] of [
        ["H1", "Movement, or still?", ["move", "Moves as you scroll"], ["still", "Sits still"]],
        ["H2", "Photos big, or facts big?", ["photo", "The car fills the screen"], ["facts", "Words and numbers lead"]],
        ["H3", "Dark, or light?", ["dark", "Dark"], ["light", "Light"]],
      ]) {
        const v = a[id];
        const label = v === "either" ? "no preference"
          : v === left[0] ? left[1] : v === right[0] ? right[1] : null;
        if (!label) unanswered += 1;
        rows.push([question, label]);
      }
    }

    for (const q of step.qs ?? []) {
      if (a[`${q.id}::web`] === true) { rows.push([q.question, "*on their website*"]); continue; }
      let val = null;
      if (q.type === "photos") {
        const v = a[q.id] ?? {};
        const bits = [];
        if (v.have) bits.push(v.have);
        if (v.files?.length) bits.push(`${v.files.length} uploaded`);
        val = bits.length ? bits.join(" · ") : null;
      } else if (q.type === "color") {
        const list = (a[q.id] ?? []).filter((c) => String(c).trim());
        val = list.length ? list.join("  ") : null;
      } else if (q.type === "place") {
        val = { top: "top of every page", hero: "under the headline", foot: "footer only",
                none: "not on the site", other: "other — see note" }[a[q.id]] ?? null;
      } else {
        val = fmt(a[q.id]);
      }
      const extra = fmt(a[`${q.id}::other`]);
      if (extra) val = val ? `${val} · other: ${extra}` : `other: ${extra}`;
      if (!val) unanswered += 1;
      rows.push([q.question, val]);
    }

    if (!rows.length) continue;
    say();
    say(`## ${step.title}`);
    say();
    for (const [question, val] of rows) {
      say(`**${question}**  \n${val ?? "— not answered"}`);
      say();
    }
  }

  say("---");
  say();
  say(`${unanswered} question${unanswered === 1 ? "" : "s"} left unanswered. `
    + "Where the brief is silent, use judgement and say in the handover where you did.");
  return out.join("\n");
}

// ── run ─────────────────────────────────────────────────────────────────────
const rows = await get("site_intake?select=*");
const byId = new Map(rows.map((r) => [r.business_id, r]));

const filter = ALL ? "" : `&slug=in.(${wanted.join(",")})`;
const businesses = await get(`businesses?select=id,name,slug&order=name${filter}`);

const dir = path.join(ROOT, "docs", "clients");
await mkdir(dir, { recursive: true });

let made = 0;
for (const biz of businesses) {
  const row = byId.get(biz.id);
  // NO ROW MEANS NOBODY OPENED THE FORM, and a brief made of 73 blanks is
  // worse than no file: it looks like an answer.
  if (!row) { if (!ALL) console.log(`  ${biz.slug}: nobody has opened the form`); continue; }
  const file = path.join(dir, `${biz.slug}-brief.md`);
  await writeFile(file, `${brief(biz, row)}\n`, "utf8");
  console.log(`  ${biz.slug}: ${row.submitted_at ? "sent" : "DRAFT"} → docs/clients/${biz.slug}-brief.md`);
  made += 1;
}
console.log(made ? `\n${made} brief${made === 1 ? "" : "s"} written.` : "\nNothing to write.");
