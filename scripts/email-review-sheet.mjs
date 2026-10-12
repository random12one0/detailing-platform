// ROADMAP 99.6 - ONE PAGE WITH EVERY EMAIL AT PHONE SIZE AND A BOX UNDER EACH.
//
// Andrew wants to go through the emails with the planner: see each one the way
// a phone draws it, type or speak what is wrong with it, copy everything in one
// press and paste it back. This builds that page and then opens it in a real
// browser to check it.
//
//   node scripts/email-review-sheet.mjs                  # build + check
//   node scripts/email-review-sheet.mjs --break=drop     # sabotage: leave one email out of the page
//   node scripts/email-review-sheet.mjs --break=copy-all # sabotage: Copy returns empty boxes too
//   node scripts/email-review-sheet.mjs --shots=DIR      # also save 390 / 1440 screenshots
//
// WHERE THE EMAILS COME FROM: `scripts/render-emails.mjs`, run once per
// language, so the page shows exactly what the templates produce. Nothing here
// writes or edits any email wording. Output: belt/shots/99.6/emails.html (the
// Control Room serves that folder; it is outside the repo and never committed).
//
// No sending, no network: the page loads nothing from anywhere.

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { writeReceipt } from "./receipt.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const BREAK = arg("break", "");
const SHOTS = arg("shots", "");
const OUT_DIR = resolve(REPO, "..", "belt", "shots", "99.6");
const OUT = BREAK ? join(mkdtempSync(join(tmpdir(), "email-sheet-")), "emails.html") : join(OUT_DIR, "emails.html");

// Declared, not counted from the run: render-emails.mjs declares the same
// number, and a template dropped from either side moves one and not the other.
const EXPECTED_EMAILS = 34;

// WHO GETS IT AND WHEN IT GOES, one line each, for a reader who has never seen
// the code. Every email render-emails draws must have a row and every row must
// have an email - a new template with no row is a build failure, not a blank.
const GROUPS = { customer: "Sent to customers", detailer: "Sent to the detailer", staff: "Sent to staff", andrew: "Sent to Andrew, from the platform" };
const WHEN = {
  "customer-confirmation": ["customer", "Right after a customer books a time that is confirmed on the spot."],
  "customer-request-received": ["customer", "Right after a customer sends a request the detailer has to approve first."],
  "customer-reminder": ["customer", "Before the appointment, at the lead time the detailer picks. A second reminder can follow."],
  "customer-quote": ["customer", "When the detailer answers a request with a price of their own."],
  "customer-accepted": ["customer", "When the detailer accepts a request."],
  "customer-declined": ["customer", "When the detailer declines a request."],
  "customer-receipt": ["customer", "After the job, once the detailer marks it paid."],
  "customer-invoice": ["customer", "After the job, when the detailer sends a bill that is not paid yet."],
  "customer-invoice-card": ["customer", "Same bill, when the detailer takes cards, so it carries a pay button."],
  "customer-reschedule": ["customer", "When a booking is moved to a new day or time."],
  "customer-cancellation": ["customer", "When a booking is cancelled."],
  "customer-followup": ["customer", "Right after the receipt goes out: a thank-you with the review links."],
  "customer-confirmation-carload": ["customer", "Same as the confirmation, when the customer booked more than one car."],
  "customer-confirmation-plan": ["customer", "Same as the confirmation, when the customer is on a maintenance plan."],
  "customer-plan-link": ["customer", "When a customer asks for the link to their plan."],
  "customer-maintenance-far": ["customer", "Two months before a maintenance check is due. It also goes at 30 and 14 days."],
  "customer-maintenance-last": ["customer", "The day before a maintenance check is due."],
  "customer-campaign": ["customer", "When the detailer sends their own message to past customers."],
  "owner-new-booking": ["detailer", "Right after a customer books."],
  "owner-new-request": ["detailer", "Right after a customer sends a request that is waiting for approval."],
  "owner-new-booking-typed": ["detailer", "Same as a new booking, when the customer typed the address by hand, so it carries a warning."],
  "owner-new-booking-picked": ["detailer", "Same as a new booking, when the customer picked the address from the lookup, so there is no warning."],
  "owner-new-booking-carload": ["detailer", "Same as a new booking, when the customer booked more than one car."],
  "owner-reschedule": ["detailer", "When a booking is moved."],
  "owner-cancellation": ["detailer", "When a booking is cancelled."],
  "owner-cancellation-paid": ["detailer", "When a booking that was already paid is cancelled, so it says what to refund."],
  "owner-stale-request": ["detailer", "When a request has sat unanswered for a while."],
  "owner-plan-cancelled": ["detailer", "When a customer's plan ends."],
  "platform-payment-failed": ["detailer", "When the detailer's monthly payment to the platform does not go through."],
  "platform-suspended": ["detailer", "When the booking page is switched off after payments keep failing."],
  "platform-build-started": ["detailer", "On the day work starts on the detailer's own website, with a one-time fee on file."],
  "platform-build-started-nofee": ["detailer", "Same email, when no fee is on file."],
  "staff-invite": ["staff", "When the owner invites someone to the team."],
  "platform-new-detailer": ["andrew", "When someone new signs up."],
};

// --- 1. THE EMAILS, FROM THE SAME RENDERER, ONCE PER LANGUAGE ---------------
const tmp = mkdtempSync(join(tmpdir(), "email-render-"));
const emails = {}; // lang -> [{file, label, subject, html}]
for (const lang of ["en", "es"]) {
  const dir = join(tmp, lang);
  try {
    execFileSync(process.execPath, ["scripts/render-emails.mjs", `--lang=${lang}`, `--out=${dir}`], { cwd: REPO, stdio: "pipe" });
  } catch (e) {
    console.error(`render-emails.mjs --lang=${lang} failed, so there is nothing trustworthy to review:\n${String(e.stdout || "")}${String(e.stderr || "")}`);
    process.exit(1);
  }
  emails[lang] = JSON.parse(readFileSync(join(dir, "emails.json"), "utf8"))
    .map((m) => ({ ...m, html: readFileSync(join(dir, `${m.file}.html`), "utf8") }));
}

const failures = [];
const ids = emails.en.map((m) => m.file);
if (ids.length !== EXPECTED_EMAILS) failures.push(`render-emails drew ${ids.length} emails and this sheet declares ${EXPECTED_EMAILS}`);
if (new Set(ids).size !== ids.length) failures.push("render-emails drew the same template id twice");
if (JSON.stringify(ids) !== JSON.stringify(emails.es.map((m) => m.file))) failures.push("English and Spanish runs drew different emails");
for (const id of ids) if (!WHEN[id]) failures.push(`no "who and when" row for ${id}`);
for (const id of Object.keys(WHEN)) if (!ids.includes(id)) failures.push(`a "who and when" row for ${id}, which is not drawn`);

// --- 2. THE PAGE ------------------------------------------------------------
const shown = BREAK === "drop" ? ids.slice(0, -1) : ids;
const data = {
  groups: GROUPS,
  copyAll: BREAK === "copy-all",
  emails: shown.map((id) => {
    const en = emails.en.find((m) => m.file === id);
    const es = emails.es.find((m) => m.file === id);
    return { id, label: en.label, who: WHEN[id]?.[0] ?? "detailer", when: WHEN[id]?.[1] ?? "", subject: { en: en.subject, es: es.subject }, html: { en: en.html, es: es.html } };
  }),
};
// Every less-than sign is written as a unicode escape, so no email can close the script tag or open a comment inside it.
const json = [[String.fromCharCode(60), "003c"], [String.fromCharCode(0x2028), "2028"], [String.fromCharCode(0x2029), "2029"]]
  .reduce((s, [c, code]) => s.split(c).join(String.fromCharCode(92) + "u" + code), JSON.stringify(data));

const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Email review sheet</title>
<style>
:root{--ground:#0E1112;--panel:#161A1C;--line:#2C3438;--text:#F2F1EC;--dim:#A3ACB0;--accent:#38E08B;--accent-ink:#06210F;--serif:Georgia,"Palatino Linotype",serif;--sans:"Trebuchet MS","Gill Sans",Verdana,sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:radial-gradient(1200px 500px at 0 -100px,#17221D 0,transparent 70%),var(--ground);color:var(--text);font:16px/1.55 var(--sans);overflow-wrap:anywhere}
.wrap{max-width:1360px;margin:0 auto;padding:0 16px 48px}
header.intro{padding:28px 0 8px}
h1{font:400 clamp(28px,5vw,44px)/1.1 var(--serif);margin:0 0 10px;letter-spacing:-.01em}
.lede{color:var(--dim);max-width:60ch;margin:0}
.lede b{color:var(--text);font-weight:600}
.bar{position:sticky;top:0;z-index:5;margin:16px -16px 0;padding:10px 16px;background:rgba(14,17,18,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.seg button{font:inherit;color:var(--dim);background:transparent;border:0;min-height:44px;min-width:96px;padding:0 16px;cursor:pointer}
.seg button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);font-weight:700}
.count{color:var(--dim);font-size:14px}
.count b{color:var(--text)}
h2{font:400 22px/1.2 var(--serif);margin:36px 0 14px;padding-top:6px;border-top:1px solid var(--line)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,392px),1fr));gap:8px 28px;align-items:start}
.card{margin:0 0 22px;display:block}
.card h3{font:600 17px/1.3 var(--sans);margin:0 0 4px}
.meta{margin:0 0 10px;font-size:14px;color:var(--dim)}
.meta>span{display:block}
.meta b{color:var(--text);font-weight:600}
.phone{box-sizing:content-box;width:100%;max-width:390px;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:#fff}
.phone iframe{display:block;width:100%;height:600px;border:0;background:#fff}
@media (max-width:430px){.phone{margin:0 -16px;width:auto;max-width:none;border-radius:0;border-left:0;border-right:0}}
.note{display:block;margin:12px 0 0;max-width:390px}
.note span{display:block;font-size:14px;color:var(--dim);margin-bottom:4px}
.note textarea{display:block;width:100%;min-height:96px;resize:vertical;font:16px/1.45 var(--sans);color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}
.note textarea:focus{outline:2px solid var(--accent);outline-offset:1px}
.note.has textarea{border-color:var(--accent)}
.done{margin-top:28px;padding:20px 0 0;border-top:1px solid var(--line);max-width:620px}
.copy{font:700 17px/1 var(--sans);min-height:52px;padding:0 24px;border-radius:14px;border:0;background:var(--accent);color:var(--accent-ink);cursor:pointer;width:100%;max-width:390px}
.copy:focus-visible,.seg button:focus-visible{outline:2px solid var(--text);outline-offset:2px}
#status{margin:12px 0 0;min-height:1.5em;color:var(--text)}
#out{display:none;width:100%;min-height:180px;margin-top:8px;font:14px/1.5 ui-monospace,Consolas,monospace;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}
</style></head><body><div class="wrap">
<header class="intro">
<h1>Every email, as a phone shows it</h1>
<p class="lede">These are the real emails, drawn by the same code that sends them. Type or speak what you want changed in the box under each one (the microphone on your phone's keyboard works). Leave a box empty if the email is fine. When you are done, press <b>Copy all my notes</b> at the very bottom and paste into the planner. Nothing here sends anything.</p>
</header>
<div class="bar">
<div class="seg" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="true">English</button><button type="button" data-lang="es" aria-pressed="false">Español</button></div>
<div class="count" aria-live="polite"><b id="filled">0</b> of <b id="total">0</b> emails have a note</div>
</div>
<main id="main"></main>
<section class="done"><button class="copy" id="copy" type="button">Copy all my notes</button>
<p id="status" role="status"></p><textarea id="out" readonly aria-label="Your notes, as copied"></textarea></section>
</div>
<script id="data" type="application/json">${json}</script>
<script>
(function(){
var D=JSON.parse(document.getElementById("data").textContent);
var KEY="email-review-notes-v1", lang="en", notes={};
try{notes=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){notes={};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(notes));}catch(e){}}
var main=document.getElementById("main");
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n;}
var frames={}, subj={};
Object.keys(D.groups).forEach(function(g){
  var list=D.emails.filter(function(e){return e.who===g;}); if(!list.length)return;
  var sec=el("section"); sec.appendChild(el("h2","",D.groups[g]));
  var cards=el("div","cards");
  list.forEach(function(e){
    var c=el("article","card"); c.setAttribute("data-email",e.id);
    c.appendChild(el("h3","",e.label));
    var m=el("p","meta"); var s1=el("span"),s2=el("span");
    s1.appendChild(el("b","","Subject: ")); subj[e.id]=el("span","",""); s1.appendChild(subj[e.id]);
    s2.appendChild(el("b","","Sent: ")); s2.appendChild(document.createTextNode(e.when));
    m.appendChild(s1); m.appendChild(s2); c.appendChild(m);
    var ph=el("div","phone"), f=document.createElement("iframe");
    f.title=e.label; f.setAttribute("sandbox","allow-same-origin"); f.addEventListener("load",function(){fit(f);});
    ph.appendChild(f); c.appendChild(ph); frames[e.id]=f;
    var lab=el("label","note"); lab.appendChild(el("span","","What should change in this email?"));
    var ta=document.createElement("textarea"); ta.setAttribute("data-note",e.id); ta.value=notes[e.id]||"";
    ta.addEventListener("input",function(){var v=ta.value; if(v.trim())notes[e.id]=v; else delete notes[e.id]; lab.classList.toggle("has",!!v.trim()); save(); count();});
    lab.classList.toggle("has",!!ta.value.trim()); lab.appendChild(ta); c.appendChild(lab);
    cards.appendChild(c);
  });
  sec.appendChild(cards); main.appendChild(sec);
});
function fit(f){try{var d=f.contentDocument; f.style.height=Math.ceil(d.documentElement.scrollHeight)+"px";}catch(e){}}
function show(l){
  lang=l; document.documentElement.lang=l;
  Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"),function(b){b.setAttribute("aria-pressed",String(b.getAttribute("data-lang")===l));});
  D.emails.forEach(function(e){subj[e.id].textContent=e.subject[l]; frames[e.id].srcdoc=e.html[l];});
}
Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"),function(b){b.addEventListener("click",function(){show(b.getAttribute("data-lang"));});});
function count(){document.getElementById("filled").textContent=D.emails.filter(function(e){return (notes[e.id]||"").trim();}).length;}
document.getElementById("total").textContent=D.emails.length; count(); show("en");
addEventListener("resize",function(){D.emails.forEach(function(e){fit(frames[e.id]);});});
// ONLY THE BOXES HE FILLED. A note is what is in the box right now, trimmed.
function compose(){
  var rows=D.emails.filter(function(e){var t=(document.querySelector('[data-note="'+e.id+'"]').value||"").trim(); return D.copyAll||t;});
  if(!rows.length)return "";
  return "NOTES ON THE EMAILS ("+rows.length+" of "+D.emails.length+")\\n\\n"+rows.map(function(e){
    return "## "+e.label+" ["+e.id+"]\\n"+document.querySelector('[data-note="'+e.id+'"]').value.trim();}).join("\\n\\n")+"\\n";
}
function legacyCopy(t,box){box.style.display="block";box.value=t;box.focus();box.select();var ok=false;try{ok=document.execCommand("copy");}catch(e){}return ok;}
document.getElementById("copy").addEventListener("click",function(){
  var t=compose(), st=document.getElementById("status"), box=document.getElementById("out");
  if(!t){box.style.display="none";st.textContent="Nothing to copy yet. Write a note under at least one email.";return;}
  var n=t.split("\\n## ").length-1;
  function done(ok){st.textContent=ok?"Copied "+n+(n===1?" note":" notes")+". Paste it into the planner. It is also shown below.":"The phone would not copy by itself. Select the text below and copy it by hand.";box.style.display="block";box.value=t;}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){done(true);},function(){done(legacyCopy(t,box));});}
  else done(legacyCopy(t,box));
});
})();
</script></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);

// --- 3. THE CANARY, ON THE PAGE'S OWN TEXT ----------------------------------
// The count question, asked of a page with one email left out. If this passes,
// "34 of 34" above means nothing.
const articleIds = (html) => {
  const d = JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  return d.emails.map((e) => e.id);
};
const countQuestion = (html) => {
  const got = articleIds(html);
  return got.length === EXPECTED_EMAILS && new Set(got).size === got.length && ids.every((i) => got.includes(i));
};
const canaryPage = page.replace(/"id":"customer-followup",/, '"id":"gone",');
const canaryCaught = !countQuestion(canaryPage);
if (!countQuestion(page)) failures.push(`the page holds ${articleIds(page).length} of ${EXPECTED_EMAILS} declared emails (or a duplicate / a missing id)`);

// --- 4. THE REAL BROWSER ----------------------------------------------------
let assertions = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); };
const server = createServer((req, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(readFileSync(OUT)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_ = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const consoleBad = [];
try {
  for (const [w, h] of [[390, 844], [320, 700], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, permissions: ["clipboard-read", "clipboard-write"], deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleBad.push(`${w}: ${m.text()}`); });
    page.on("pageerror", (e) => consoleBad.push(`${w}: ${e.message}`));
    await page.goto(URL_);
    await page.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerText.length > 40));
    await page.waitForTimeout(400);
    for (const lang of ["en", "es"]) {
      if (lang === "es") { await page.click('[data-lang="es"]'); await page.waitForTimeout(700); await page.waitForFunction(() => [...document.querySelectorAll("iframe")].every((f) => f.contentDocument && f.contentDocument.documentElement.lang === "es")); await page.waitForTimeout(300); }
      const m = await page.evaluate(() => {
        const cards = [...document.querySelectorAll("article[data-email]")];
        const vw = document.documentElement.clientWidth;
        return {
          ids: cards.map((c) => c.getAttribute("data-email")),
          pageOverflow: document.documentElement.scrollWidth - vw,
          vw,
          frames: cards.map((c) => { const f = c.querySelector("iframe"), d = f.contentDocument, r = f.getBoundingClientRect(); const cr = c.getBoundingClientRect(); return { id: c.getAttribute("data-email"), w: Math.round(r.width), h: Math.round(r.height), docW: d.documentElement.scrollWidth, docClientW: d.documentElement.clientWidth, bodyH: d.documentElement.scrollHeight, left: Math.round(cr.left), right: Math.round(cr.right), text: d.body.innerText.length, lang: d.documentElement.lang }; }),
          noteBoxes: document.querySelectorAll("textarea[data-note]").length,
          subjects: cards.map((c) => c.querySelector(".meta span").textContent.length),
          sentLines: cards.map((c) => c.querySelectorAll(".meta span")[1].textContent.length),
        };
      });
      const tag = `${lang} @${w}`;
      check(m.ids.length === EXPECTED_EMAILS && new Set(m.ids).size === m.ids.length && ids.every((i) => m.ids.includes(i)), `${tag}: ${m.ids.length} email cards on the page, ${EXPECTED_EMAILS} declared (each once)`);
      check(m.noteBoxes === EXPECTED_EMAILS, `${tag}: ${m.noteBoxes} note boxes for ${EXPECTED_EMAILS} emails`);
      check(m.pageOverflow <= 0, `${tag}: the page is ${m.pageOverflow}px wider than the screen`);
      const cut = m.frames.filter((f) => f.left < 0 || f.right > m.vw + 0.5 || f.w > Math.min(390, m.vw) + 0.5 || f.w < Math.min(390, m.vw) - 0.5);
      check(!cut.length, `${tag}: ${cut.length} frame(s) cut by the screen edge or wider than 390 (${cut.slice(0, 3).map((f) => f.id).join(", ")})`);
      const wide = m.frames.filter((f) => f.docW > f.docClientW + 1);
      check(!wide.length, `${tag}: ${wide.length} email(s) scroll sideways inside their frame (${wide.slice(0, 3).map((f) => `${f.id} ${f.docW}>${f.docClientW}`).join(", ")})`);
      const clipped = m.frames.filter((f) => f.h < f.bodyH - 1);
      check(!clipped.length, `${tag}: ${clipped.length} frame(s) shorter than their email (${clipped.slice(0, 3).map((f) => f.id).join(", ")})`);
      const empty = m.frames.filter((f) => f.text < 40 || f.h < 150);
      check(!empty.length, `${tag}: ${empty.length} frame(s) empty or collapsed`);
      const wrongLang = m.frames.filter((f) => f.lang !== lang);
      check(!wrongLang.length, `${tag}: ${wrongLang.length} frame(s) not in ${lang}`);
      check(m.subjects.every((n) => n > 12) && m.sentLines.every((n) => n > 10), `${tag}: a subject or a "sent" line is empty`);
      if (SHOTS && lang === "en") {
        mkdirSync(SHOTS, { recursive: true });
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: join(SHOTS, `sheet-${w}.jpg`), type: "jpeg", quality: 70 });
        await page.locator('article[data-email="customer-invoice-card"]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(SHOTS, `sheet-${w}-mid.jpg`), type: "jpeg", quality: 70 });
      }
    }
    await page.click('[data-lang="en"]');
    if (w !== 320) {
      // Nothing written: refused, and the clipboard keeps what it had.
      await page.evaluate(() => navigator.clipboard.writeText("UNTOUCHED"));
      await page.locator("#copy").scrollIntoViewIfNeeded();
      await page.click("#copy");
      check((await page.textContent("#status")).startsWith("Nothing to copy"), `@${w}: Copy with every box empty did not say so`);
      check((await page.evaluate(() => navigator.clipboard.readText())) === "UNTOUCHED", `@${w}: Copy with every box empty still changed the clipboard`);
      // Two boxes filled, one with only spaces: exactly two notes, labeled.
      await page.fill('[data-note="customer-invoice"]', "Say what the amount is for. Too stiff.");
      await page.fill('[data-note="owner-new-booking"]', "Put the phone number first.");
      await page.fill('[data-note="customer-receipt"]', "   ");
      await page.locator("#copy").scrollIntoViewIfNeeded();
      await page.click("#copy");
      const got = await page.evaluate(() => navigator.clipboard.readText());
      const heads = got.split("\n").filter((l) => l.startsWith("## "));
      check(heads.length === 2 && heads[0].startsWith("## Customer · invoice (unpaid) [customer-invoice]") && heads[1].startsWith("## Owner · new booking [owner-new-booking]"), `@${w}: copied text has ${heads.length} headings, expected the 2 filled boxes (${JSON.stringify(heads)})`);
      check(got.includes("Say what the amount is for. Too stiff.") && got.includes("Put the phone number first.") && !got.includes("customer-receipt"), `@${w}: copied text is missing a note or includes a blank one`);
      check((await page.textContent("#filled")) === "2", `@${w}: the "have a note" count did not read 2`);
      // Kept in the browser: a reload keeps both.
      await page.reload();
      await page.waitForTimeout(300);
      check((await page.inputValue('[data-note="owner-new-booking"]')) === "Put the phone number first.", `@${w}: a note did not survive a reload`);
      check((await page.textContent("#filled")) === "2", `@${w}: the count did not survive a reload`);
    }
    await ctx.close();
  }
  // Storage blocked: the page still draws, still takes notes, still copies.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage();
  await p.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(URL_);
  await p.fill('[data-note="customer-quote"]', "Blocked-storage note.");
  await p.locator("#copy").scrollIntoViewIfNeeded();
  await p.click("#copy");
  check(errs.length === 0 && (await p.evaluate(() => navigator.clipboard.readText())).includes("Blocked-storage note."), `storage blocked: ${errs[0] || "copy did not work"}`);
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
check(consoleBad.length === 0, `console: ${consoleBad.slice(0, 3).join(" | ")}`);

console.log(`${articleIds(page).length} of ${EXPECTED_EMAILS} emails on the page -> ${OUT}`);
console.log(`${assertions} browser assertions, canary (one email missing) ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
for (const f of failures) console.error("  - " + f);

const { path: receiptPath } = writeReceipt({
  check_id: "email-review-sheet",
  started_at: new Date().toISOString(),
  status: failures.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: EXPECTED_EMAILS,
  discovered_targets: articleIds(page).length,
  attempted_targets: articleIds(page).length,
  completed_targets: articleIds(page).length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 40,
  failures,
  artifacts: [],
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: { widths: [390, 320, 1440], languages: ["en", "es"], ...(BREAK ? { break: BREAK } : {}) },
  canary: {
    id: "a page with one email's id replaced must fail the count-and-identity question",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? ["count/identity"] : [],
    findings: canaryCaught ? ["[count] a page with one email swapped for another id fails the each-once question"] : ["[count] NOT CAUGHT - a page missing an email passed"],
  },
});
console.log(`Receipt ${receiptPath}`);
process.exit(failures.length || !canaryCaught ? 1 : 0);
