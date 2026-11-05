// A Studio site: one spec (design + wording + bindings) drawn against the
// detailer's live public profile. The site holds no copy of any fact — every
// price, service, hour, photo, review and phone number is looked up through
// `resolve()` on each visit, and every bound element says where it came from
// in `data-from`. STUDIO-SPEC.md §2c layers 1 and 2.
import { Component, useEffect, useMemo } from "react";
import { MemoryRouter } from "react-router-dom";
import { BookingBusinessProvider, useBookingBusiness } from "../book/BookingBusinessContext.jsx";
import { FONTS, resolve, validateSpec } from "./spec.js";
import { Hero, Catalog, Proof, Visit, Booking } from "./sections.jsx";
import { phone as phoneText } from "../lib/format.js";
import "../book/booking.css";
import "./site.css";

const SECTIONS = { hero: Hero, catalog: Catalog, proof: Proof, visit: Visit, booking: Booking };

export default function Site({ spec }) {
  const slug = typeof spec?.slug === "string" ? spec.slug : null;
  if (!slug) return <NotFound />;
  // The booking flow drives a router (its step lives in `?step=`). A memory
  // router keeps that inside the booking section, so the site's own address
  // never changes under the customer.
  return (
    <MemoryRouter initialEntries={[window.location.pathname]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BookingBusinessProvider slug={slug}>
        <Guard tokens={spec.tokens}><SiteBody spec={spec} /></Guard>
      </BookingBusinessProvider>
    </MemoryRouter>
  );
}

function SiteBody({ spec }) {
  const p = useBookingBusiness();
  useFonts(spec.tokens);
  // A validator that throws must still refuse, never leave a blank page.
  const check = useMemo(() => {
    if (p.status !== "ready") return null;
    try { return validateSpec(spec, p, { live: true }); } catch (e) { return { ok: false, errors: [{ path: "spec", code: "crash", message: String(e?.message || e) }] }; }
  }, [spec, p]);
  useMeta(spec, p, check?.ok);

  if (p.status === "loading") return <div className="site site-wait" style={tokenVars(spec.tokens)} aria-busy="true" />;
  if (p.status === "not_found") return <NotFound />;
  if (p.status === "error") {
    return (
      <Shell tokens={spec.tokens}>
        <main id="main" className="site-msg"><h1>This page could not load</h1><p>Please refresh in a moment.</p></main>
      </Shell>
    );
  }
  if (!check.ok) return <Refused errors={check.errors} tokens={spec.tokens} phone={p.business?.phone} />;

  const page = spec.pages.find((x) => x.path === "/") ?? spec.pages[0];
  const phone = resolve("contact.phone", p);
  const bookId = page.sections.find((s) => s.type === "booking")?.id ?? null;
  const anchors = page.sections.filter((s) => s.type !== "hero" && s.copy?.title).map((s) => [s.id, navWord(s.type)]);
  return (
    <Shell tokens={spec.tokens}>
      <a className="site-skip" href="#main">Skip to content</a>
      <header className="site-nav">
        <a className="site-name" href="#top">{p.business.name}</a>
        <nav aria-label="Sections">
          <ul>{anchors.filter(([, w]) => w !== "Book").map(([id, w]) => <li key={id}><a href={`#${id}`}>{w}</a></li>)}</ul>
        </nav>
        {phone && <a className="site-btn ghost site-navcall" href={`tel:${phone}`} data-from="contact.phone" aria-label={`Call ${phoneText(phone)}`}>Call</a>}
        {bookId && <a className="site-btn" href={`#${bookId}`} data-book data-from="book">Book</a>}
      </header>
      <main id="main" tabIndex={-1}>
        {page.sections.map((sec) => {
          const Section = SECTIONS[sec.type];
          return <Section key={sec.id} sec={sec} p={p} bookId={bookId} />;
        })}
      </main>
      <footer className="site-foot">
        <p className="site-name">{p.business.name}</p>
        {phone && <p><a href={`tel:${phone}`} data-from="contact.phone">{phoneText(phone)}</a></p>}
        <p className="site-soft">Prices, times and bookings run on the detailer’s own dashboard.</p>
      </footer>
    </Shell>
  );
}

const navWord = (type) => ({ catalog: "Prices", proof: "Work", visit: "Visit", booking: "Book" })[type];

function Shell({ tokens, children }) {
  return <div className="site" id="top" style={tokenVars(tokens)}>{children}</div>;
}

const tokenVars = (t = {}) => ({
  "--paper": t.paper, "--paper-2": t.paper_2 ?? t.paper, "--ink": t.ink, "--soft": t.soft ?? t.ink,
  "--accent": t.accent, "--on-accent": t.on_accent ?? t.paper, "--radius": `${t.radius ?? 6}px`,
  "--f-display": `"${t.font_display}", Georgia, serif`, "--f-body": `"${t.font_body}", system-ui, sans-serif`,
});

// The two families a spec names, from the curated list in spec.js.
function useFonts(tokens) {
  useEffect(() => {
    const families = [...new Set([tokens?.font_display, tokens?.font_body])].filter((f) => f in FONTS);
    if (!families.length) return undefined;
    const link = Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, "+")}:${FONTS[f]}`).join("&")}&display=swap`,
    });
    document.head.appendChild(link);
    return () => link.remove();
  }, [tokens?.font_display, tokens?.font_body]);
}

// Search basics (M17), filled from the profile: description, canonical and the
// LocalBusiness record with the area served, the phone, the hours and the prices.
function useMeta(spec, p, ok) {
  useEffect(() => {
    if (!ok) return undefined;
    const hero = spec.pages[0].sections.find((s) => s.type === "hero");
    const area = resolve("area", p);
    const set = (sel, make, attr, value) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = make(); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    const desc = [hero?.copy?.headline, area?.text].filter(Boolean).join(" ");
    set('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }), "content", desc);
    set('meta[property="og:description"]', () => { const m = document.createElement("meta"); m.setAttribute("property", "og:description"); return m; }, "content", desc);
    set('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", location.origin + location.pathname);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const ld = {
      "@context": "https://schema.org", "@type": ["LocalBusiness", "AutoWash"], name: p.business.name,
      telephone: p.business.phone || undefined, url: location.origin + location.pathname,
      areaServed: [...new Set([area?.text, ...(area?.zones ?? []).map((z) => z.name)].filter(Boolean))],
      openingHoursSpecification: p.hours.filter((h) => h.open_time && h.close_time)
        .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[h.weekday], opens: h.open_time.slice(0, 5), closes: h.close_time.slice(0, 5) })),
      makesOffer: p.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name },
        priceSpecification: { "@type": "PriceSpecification", price: Number(s.price), priceCurrency: "USD", ...(s.price_is_from ? { minPrice: Number(s.price) } : {}) } })),
    };
    const script = Object.assign(document.createElement("script"), { type: "application/ld+json", textContent: JSON.stringify(ld) });
    document.head.appendChild(script);
    return () => script.remove();
  }, [spec, p, ok]);
}

function NotFound() {
  useEffect(() => { document.title = "No site here"; }, []);
  return (
    <div className="site site-plain">
      <main id="main" className="site-msg" data-notfound="1">
        <h1>There is no site at this address</h1>
        <p>Check the link you were sent. If you were booking with a detailer, their own link or phone number will get you there.</p>
        <p><a className="site-btn" href="/">Go to Detailing Platform</a></p>
      </main>
    </div>
  );
}

// A spec that fails validation is never drawn, so a typed price or a binding to a
// deleted service cannot reach a customer even if it somehow got saved. The
// customer is told only that the page is unavailable, and how to reach the
// detailer; the reasons are for the Studio (which runs the same validator before
// any save) and go to the console here, never onto the page.
function Refused({ errors, tokens, phone }) {
  // Inside the Studio's phone frame the Studio itself says why (it shows the check's reasons), so there this is a note.
  useEffect(() => { (window.parent !== window ? console.info : console.error)("Studio site refused:", errors); document.title = "Page unavailable"; }, [errors]);
  return (
    <Shell tokens={tokens}>
      <main id="main" className="site-msg" data-refused={errors.length}>
        <h1>This page is unavailable right now</h1>
        <p>Please try again later{phone ? ", or call us." : "."}</p>
        {phone && <p><a className="site-btn" href={`tel:${phone}`}>Call {phoneText(phone)}</a></p>}
      </main>
    </Shell>
  );
}

// Anything that throws while drawing shows the same plain page, never a blank one.
class Guard extends Component {
  constructor(props) { super(props); this.state = { failed: null }; }
  static getDerivedStateFromError(failed) { return { failed }; }
  render() {
    return this.state.failed ? <Refused errors={[{ path: "render", code: "crash", message: String(this.state.failed?.message || this.state.failed) }]} tokens={this.props.tokens} /> : this.props.children;
  }
}
