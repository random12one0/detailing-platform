// ROADMAP 7.1 — /terms and /privacy.
//
// ONE COMPONENT, TWO ROUTES, because they are the same page with different
// words: a heading, a lede, and a ruled list of "here is a thing, here is what
// it means". Two components would be two places to keep the reveal, the nav
// and the back link in step, and this surface has already had one defect from
// a second copy of its motion system (`initThread` is guarded rather than
// copied for exactly that reason).
//
// THE CONTENT IS IN `legal.js` AND EVERY LINE OF IT IS A FACT ABOUT THIS
// PRODUCT. The roadmap calls these placeholders and says the owner supplies
// real legal text later; what a placeholder must NOT be is borrowed
// boilerplate about arbitration and governing law, which is a promise he has
// not made in language he cannot check. See that file's header.

import { useEffect } from "react";
import { Ground, Foot } from "./LandingPage.jsx";
import { initThread } from "./thread.js";
import { TERMS, PRIVACY, NOT_YET_LAWYERED, SUPPORT_EMAIL, ENTITY, EFFECTIVE } from "./legal.js";
import "./landing.css";

// EMPHASIS AND LINKS INSIDE A SECTION'S PROSE.
//
// `legal.js` has always written emphasis as `**like this**`, and a `<dd>`
// handed a plain string printed the asterisks — **live on /privacy, on the
// one sentence the owner asked to have said out loud** ("nothing here is ever
// sold, rented or handed to an advertiser"). The markup was in the content
// from the day it was written; nothing had ever turned it into anything.
//
// ONE PASS FOR BOTH EMPHASIS AND LINKS, rather than a bold pass and then a
// link pass. Two passes over the same string means the second one walks over
// the first one's output, which is where this kind of helper usually starts
// double-escaping or eating an address that happens to sit inside a bold run.
//
// It is deliberately NOT a markdown renderer. Three constructs, no nesting,
// no headings, no lists — anything more and the content file has quietly
// become a document format nobody chose.
const INLINE = /\*\*(.+?)\*\*|(https?:\/\/[^\s]+?)(?=[.,)]?(?:\s|$))|([\w.+-]+@[\w-]+\.[\w.]+)/g;

function inline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2]) out.push(<a className="lk" key={m.index} href={m[2]} target="_blank" rel="noreferrer">{m[2]}</a>);
    else out.push(<a className="lk" key={m.index} href={`mailto:${m[3]}`}>{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function LegalPage({ which }) {
  const doc = which === "privacy" ? PRIVACY : TERMS;

  // Every `.ld` page mounts the same motion system, guarded rather than
  // copied. It is a route in an SPA, so what it opens has to close again.
  useEffect(() => initThread(), []);

  return (
    <div className="ld legalpage">
      <Ground />

      <nav className="nav" id="nav" aria-label="Main">
        <span className="nav__g"><i></i></span>
        <a className="mk" href="/">Detailing Platform</a>
        <a className="lk hide-s" href="/pricing">Pricing</a>
        <a className="lk hide-s" href="/#faq">Questions</a>
        <a className="lk" href="/app">Sign in</a>
      </nav>

      <main id="top">
        <section className="phead wrap">
          <a className="backlink" href="/" data-rv="">
            <span className="ar back" aria-hidden="true">→</span>Back to the site
          </a>
          <span className="lab" data-rv="" style={{ "--i": 1 }}>{doc.label}</span>
          <h1 className="disp" style={{ marginTop: 14 }}>
            {doc.title.map((line, i) => (
              <span className="mask" key={line} style={i ? { "--i": i } : undefined}><span>{line}</span></span>
            ))}
          </h1>
          <p className="lede" data-rv="" style={{ "--i": 2 }}>{doc.lede}</p>
          {/* WHO, AND SINCE WHEN. A policy carrying neither is not something a
              reader can rely on, and Google's reviewer looks for both. The
              legal person is ONE constant in `legal.js` — see its header, it
              is still a guess at Andrew's paperwork. */}
          <p className="legalnote" data-rv="" style={{ "--i": 3 }}>
            {ENTITY} · Effective {EFFECTIVE}
          </p>
        </section>

        <section className="wrap">
          {/* SAID AT THE TOP RATHER THAN IN A FOOTNOTE. A reader who finds out
              at the bottom that a lawyer has not seen this has read the whole
              thing on a wrong assumption. */}
          <p className="legalnote" data-rv="">{NOT_YET_LAWYERED}</p>

          <dl className="legal">
            {doc.sections.map(([what, words], i) => (
              // THE REVEAL IS ON A WRAPPER THAT IS ALWAYS MOUNTED. `thread.js`
              // collects its revealables with ONE `querySelectorAll` at mount
              // and that list is STATIC, so anything React adds later never
              // gets `.in` and sits at opacity 0 for ever — invisible to the
              // width sweep, to `?lite=1` and to every contrast check. These
              // rows are not conditional, which is what makes it safe.
              <div className="legalrow" data-rv="" style={{ "--i": Math.min(i, 4) }} key={what}>
                <dt>{what}</dt>
                <dd>{inline(words)}</dd>
              </div>
            ))}
          </dl>

          <p className="legalnote" data-rv="">
            Anything here that is unclear, or that you disagree with:{" "}
            <a className="lk" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>

        <Foot />
      </main>
    </div>
  );
}
