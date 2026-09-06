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
import { TERMS, PRIVACY, NOT_YET_LAWYERED, SUPPORT_EMAIL } from "./legal.js";
import "./landing.css";

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
                <dd>{words}</dd>
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
