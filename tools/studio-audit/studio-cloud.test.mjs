// Website autofill's own rules (studio-cloud.mjs), with no network: which questions are read for, how a website is
// read (never this laptop or the home network, only the detailer's own host), and that only answers and prices whose
// quote is really on the fetched page are kept.
//   node --test studio-cloud.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { wanted, readSite, pageText, checkAutofill, cleanUrl, isPrivate, cloudConfig, AUTOFILL_IDS } from "./studio-cloud.mjs";

const Q = [{ id: "A1", question: "Name", type: "text" }, { id: "A2", question: "About", type: "long" }, { id: "A4", question: "Towns", type: "long" }, { id: "A12", question: "Never say", type: "long" }, { id: "E5", question: "Minimum charge", type: "text" }];

test("only ticked or empty questions, only the ones a website can answer, never one the detailer answered", () => {
  const w = wanted({ A1: "Shine Co", A2: "We started in 2019", "A2::web": true, A4: "", "A12::web": true }, Q);
  assert.deepEqual(w.map((q) => [q.id, q.ticked]), [["A2", true], ["A4", false], ["E5", false]]);
  assert.ok(!AUTOFILL_IDS.includes("A12"), "what the site must never say is the detailer's own word");
});

test("website addresses: http(s) only, a real host, no logins in it, no odd ports; private addresses refused", () => {
  assert.equal(cleanUrl("shineco.com").href, "https://shineco.com/");
  assert.equal(cleanUrl("javascript:alert(1)"), null);
  assert.equal(cleanUrl("http://user:pw@shineco.com"), null);
  assert.equal(cleanUrl("http://shineco.com:8080"), null);
  assert.equal(cleanUrl("localhost"), null);
  for (const ip of ["127.0.0.1", "10.0.0.2", "192.168.0.192", "172.20.1.1", "169.254.169.254", "::1", "fd00::1"]) assert.equal(isPrivate(ip), true, ip);
  assert.equal(isPrivate("93.184.216.34"), false);
});

const html = (body, links = "") => `<html><head><style>.x{}</style><script>evil()</script></head><body>${links}${body}</body></html>`;
function fakeWeb(pages) {
  const asked = [];
  const fetchImpl = async (u) => { asked.push(u); const p = pages[u]; if (!p) return new Response("no", { status: 404 }); if (p.to) return new Response("", { status: 301, headers: { location: p.to } }); return new Response(p, { headers: { "content-type": "text/html; charset=utf-8" } }); };
  return { asked, fetchImpl };
}
const publicDns = async () => [{ address: "93.184.216.34" }];

test("reads the home page, then the detailer's own likeliest pages; never another host; script text is not page text", async () => {
  const w = fakeWeb({
    "https://shineco.com/": html("<h1>Shine Co</h1><p>Mobile detailing in Leeds &amp; York</p>", '<a href="/about">About</a><a href="/blog/x">Blog</a><a href="https://evil.test/services">x</a><a href="/services#top">Services</a><a href="/menu.pdf">pdf</a>'),
    "https://shineco.com/about": html("<p>Started in 2019 by Sam.</p>"),
    "https://shineco.com/services": html("<p>Full detail $185</p>"),
  });
  const r = await readSite("shineco.com", { pages: 3, fetchImpl: w.fetchImpl, resolve: publicDns });
  assert.equal(r.ok, true);
  assert.deepEqual(r.pages.map((p) => p.url), ["https://shineco.com/", "https://shineco.com/about", "https://shineco.com/services"]);
  assert.ok(!w.asked.some((u) => u.includes("evil.test") || u.endsWith(".pdf")));
  assert.match(r.pages[0].text, /Leeds & York/);
  assert.doesNotMatch(r.pages[0].text, /evil\(\)|\.x\{/);
});

test("a site whose name points at the home network, or that redirects there, is not read", async () => {
  const local = await readSite("router.shineco.com", { fetchImpl: async () => new Response("x"), resolve: async () => [{ address: "192.168.0.1" }] });
  assert.equal(local.ok, false); assert.match(local.said, /not a public website/);
  const w = fakeWeb({ "https://shineco.com/": { to: "http://127.0.0.1/admin" } });
  const r = await readSite("https://shineco.com", { fetchImpl: w.fetchImpl, resolve: publicDns });
  assert.equal(r.ok, false); assert.ok(!w.asked.includes("http://127.0.0.1/admin"));
});

test("only answers and prices quoted from the page are kept; an invented one is dropped, never filled", () => {
  const pages = [{ url: "https://shineco.com/", text: pageText("<p>We are “Shine Co” — mobile detailing since 2019.</p><p>Full   detail: $185</p>") }];
  const k = checkAutofill({
    answers: [
      { id: "A2", value: "Mobile detailing since 2019.", page: 1, quote: 'We are "Shine Co" - mobile detailing since 2019.' },
      { id: "A4", value: "Leeds and York", page: 1, quote: "Serving Leeds and York" },          // not on the page
      { id: "A12", value: "x", page: 1, quote: "Shine Co" },                                     // not asked
      { id: "E5", value: "$50", page: 2, quote: "Full detail" },                                 // no such page
    ],
    prices: [
      { service: "Full detail", price: "$185", page: 1, quote: "Full detail: $185" },
      { service: "Ceramic coat", price: "$900", page: 1, quote: "Full detail: $185" },           // price not in its quote
      { service: "Interior", price: "$120", page: 1, quote: "Interior $120" },                   // not on the page
    ],
  }, Q.filter((q) => ["A2", "A4", "E5"].includes(q.id)), pages);
  assert.deepEqual(Object.keys(k.answers), ["A2"]);
  assert.equal(k.answers.A2.url, "https://shineco.com/");
  assert.deepEqual(k.prices.map((p) => p.price), ["$185"]);
  assert.equal(k.dropped.length, 5);
});

test("the database comes from the real repo's own key files, or from nowhere when off", () => {
  assert.equal(cloudConfig({ cloud: "off" }, "C:/nowhere", {}), null);
  assert.match(cloudConfig({ cloud: "live" }, "C:/nowhere", {}).missing, /SUPABASE_URL/);
  assert.deepEqual(cloudConfig({ cloud: "staging" }, "C:/nowhere", { STUDIO_CLOUD_URL: "http://127.0.0.1:9/", STUDIO_CLOUD_KEY: "k" }), { url: "http://127.0.0.1:9", key: "k", which: "staging" });
});
