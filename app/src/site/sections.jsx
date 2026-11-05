// The five S1 section types. Each draws its spec's wording and nothing else from
// the spec; everything factual comes from `resolve(binding, profile)` and is
// stamped `data-from="<binding>"`. `data-section` / `data-part` give the Studio's
// picker stable handles (STUDIO-SPEC.md §6d). A slot whose data is absent draws
// nothing — no empty box, no placeholder.
import { useState } from "react";
import { resolve } from "./spec.js";
import { BookingFlow } from "../book/BookingPage.jsx";
import { vehicleSizeExtra } from "../book/core.js";
import { duration, money, phone as phoneText, time12 } from "../lib/format.js";
import { cadenceWords, priceWords } from "../lib/plans.js";

// The generated example art is 4:3; width/height are given so nothing shifts on load.
const IMG = { width: 1600, height: 1200 };
const bound = (sec, slot, p) => (sec[slot]?.bind ? resolve(sec[slot].bind, p) : null);
const listOf = (v) => (Array.isArray(v) ? v : []);

function Head({ sec, level = "h2" }) {
  const H = level;
  return (
    <header className="sec-head">
      <H id={`${sec.id}-title`} data-part="title">{sec.copy.title}</H>
      {sec.copy.intro && <p className="sec-intro" data-part="intro">{sec.copy.intro}</p>}
    </header>
  );
}

function SaleBand({ sale, part = "sale" }) {
  if (!sale) return null;
  return (
    <p className="sale" data-part={part} data-from="sale">
      <b>{sale.percent}% off</b> every booking{sale.label ? <span> · {sale.label}</span> : null}
    </p>
  );
}

// "Care you can see. Prices you can check." — a two-sentence headline gets its
// second sentence set in the accent italic. One sentence is drawn plain.
function Headline({ text }) {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map((s, i) => (i ? <em key={i}> {s}</em> : <span key={i}>{s}</span>));
}

function photoOf(g) {
  if (!g) return null;
  return g.kind === "before_after" ? g.after_url : g.image_url;
}

// ------------------------------------------------------------------ hero
export function Hero({ sec, p, bookId }) {
  const photo = bound(sec, "photo", p);
  const g = Array.isArray(photo) ? photo[0] : photo;
  const src = photoOf(g);
  const group = bound(sec, "prices", p);
  const phone = bound(sec, "call", p);
  const area = bound(sec, "area", p);
  return (
    <section className="sec hero" id={sec.id} data-section={sec.id} aria-labelledby={`${sec.id}-h`}>
      {src && (
        <figure className="hero-photo" data-part="photo" data-from={g && `gallery:${g.id}`}>
          <img src={src} alt={g.caption || ""} {...IMG} fetchpriority="high" />
          {g.caption && <figcaption>{g.caption}</figcaption>}
        </figure>
      )}
      <div className="hero-copy">
        <SaleBand sale={bound(sec, "sale", p)} />
        {sec.copy.eyebrow && <p className="eyebrow" data-part="eyebrow">{sec.copy.eyebrow}</p>}
        <h1 id={`${sec.id}-h`} data-part="headline"><Headline text={sec.copy.headline} /></h1>
        {sec.copy.sub && <p className="hero-sub" data-part="sub">{sec.copy.sub}</p>}
        <div className="hero-cta" data-part="cta">
          {sec.cta && <a className="site-btn big" href={`#${bookId}`} data-book data-from="book">Book a time</a>}
          {phone && <a className="site-btn ghost" href={`tel:${phone}`} data-from="contact.phone">Call</a>}
          {phone && <a className="site-btn ghost" href={`sms:${phone}`} data-from="contact.phone">Text</a>}
        </div>
        {area?.text && <p className="hero-area" data-part="area" data-from="area">Serving {area.text}</p>}
      </div>
      {group && (
        <ol className="hero-ticket" data-part="prices" data-from={sec.prices.bind} aria-label={`${group.name} prices`}>
          {group.items.map((s) => (
            <li key={s.id}>
              <span data-from={`service:${s.id}.name`}>{s.name}</span>
              <b data-from={`service:${s.id}.price`}>{s.price_is_from && <small>from </small>}{money(s.price)}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ catalog
export function Catalog({ sec, p }) {
  const group = bound(sec, "group", p);
  const addOns = listOf(bound(sec, "add_ons", p));
  const plans = listOf(bound(sec, "plans", p));
  if (!group && !addOns.length && !plans.length) return null;
  const sizes = p.settings.vehicle_sizes ?? [];
  return (
    <section className="sec menu" id={sec.id} data-section={sec.id} aria-labelledby={`${sec.id}-title`}>
      <Head sec={sec} />
      <SaleBand sale={bound(sec, "sale", p)} />
      {group && (
        <ol className="tickets" data-part="group" data-from={sec.group.bind}>
          {group.items.map((s) => {
            // The size ladder is the booking flow's own helper (core.js): what each
            // size ADDS. The site never totals a price; the quote does that.
            const extras = sizes.map((z) => ({ ...z, extra: vehicleSizeExtra([s], z.key) }));
            const ladder = extras.some((z) => z.extra !== 0);
            const features = listOf(s.features).filter(Boolean);
            return (
              <li className="ticket" key={s.id} data-part="service">
                <div className="t-top">
                  <h3 data-from={`service:${s.id}.name`}>{s.name}</h3>
                  <p className="t-price" data-from={`service:${s.id}.price`}>
                    {s.price_is_from && <small>from</small>}{money(s.price)}
                  </p>
                </div>
                <p className="t-dur" data-from={`service:${s.id}.duration`}>About {duration(s.duration_minutes)}</p>
                {s.description && <p className="t-desc" data-from={`service:${s.id}.description`}>{s.description}</p>}
                {features.length > 0 && (
                  <ul className="t-inc" data-from={`service:${s.id}.features`} aria-label="Included">
                    {features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
                {ladder && (
                  <dl className="t-sizes" data-from={`service:${s.id}.sizes`}>
                    {extras.map((z) => (
                      <div key={z.key}>
                        <dt>{z.label}</dt>
                        <dd>{z.extra ? `+${money(z.extra)}` : "Base"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {addOns.length > 0 && (
        <div className="extras" data-part="add_ons" data-from="add_ons">
          <h3>Add to any visit</h3>
          <ul>
            {addOns.map((a) => (
              <li key={a.id}><span>{a.name}</span><b>+{money(a.price)}</b>{a.description && <small>{a.description}</small>}</li>
            ))}
          </ul>
        </div>
      )}
      {plans.length > 0 && (
        <div className="plans" data-part="plans" data-from="plans">
          <h3>Come back on a plan</h3>
          <ul>
            {plans.map((pl) => (
              <li key={pl.id}>
                <span className="pl-name">{pl.name}</span>
                <b>{priceWords(pl.price_kind, pl.price_amount, money)}</b>
                <small>{cadenceWords(pl)}{pl.description ? ` · ${pl.description}` : ""}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ proof
// The signature: a before/after you wipe across. A native range input does the
// work, so it is keyboard- and screen-reader-operable with no script of ours.
function Compare({ g }) {
  const [pos, setPos] = useState(50);
  return (
    <figure className="compare" data-from={`gallery:${g.id}`} style={{ "--pos": `${pos}%` }}>
      <div className="cmp-frame">
        <img src={g.before_url} alt={`Before: ${g.caption || "the car as it arrived"}`} {...IMG} loading="lazy" />
        <img className="cmp-after" src={g.after_url} alt={`After: ${g.caption || "the same car finished"}`} {...IMG} loading="lazy" />
        <span className="cmp-tag cmp-b" aria-hidden="true">Before</span>
        <span className="cmp-tag cmp-a" aria-hidden="true">After</span>
        <span className="cmp-line" aria-hidden="true" />
        <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Slide to compare before and after" aria-valuetext={`${pos}% after`} />
      </div>
      {g.caption && <figcaption>{g.caption}</figcaption>}
    </figure>
  );
}

const stars = (n) => "★".repeat(Math.max(0, Math.min(5, Math.round(Number(n) || 0))));

export function Proof({ sec, p }) {
  const pics = bound(sec, "gallery", p);
  const gallery = (Array.isArray(pics) ? pics : pics ? [pics] : []).filter((g) =>
    g.kind === "before_after" ? g.before_url && g.after_url : g.image_url);
  const reviews = listOf(bound(sec, "reviews", p)).filter((r) => r.quote);
  if (!gallery.length && !reviews.length) return null;
  return (
    <section className="sec work" id={sec.id} data-section={sec.id} aria-labelledby={`${sec.id}-title`}>
      <Head sec={sec} />
      {gallery.length > 0 && (
        <div className="work-grid" data-part="gallery" data-from={sec.gallery.bind}>
          {gallery.map((g) => (g.kind === "before_after" ? <Compare key={g.id} g={g} /> : (
            <figure className="still" key={g.id} data-from={`gallery:${g.id}`}>
              <img src={g.image_url} alt={g.caption || ""} {...IMG} loading="lazy" />
              {g.caption && <figcaption>{g.caption}</figcaption>}
            </figure>
          )))}
        </div>
      )}
      {reviews.length > 0 && (
        <ul className="reviews" data-part="reviews" data-from={sec.reviews.bind}>
          {reviews.map((r) => (
            <li key={r.id}>
              {r.rating ? <p className="stars" aria-label={`Rated ${r.rating} out of 5`}>{stars(r.rating)}</p> : null}
              <blockquote><p>{r.quote}</p></blockquote>
              <p className="by">{r.author}{r.source ? <span> · {r.source}</span> : null}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ visit
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function Visit({ sec, p }) {
  const hours = listOf(bound(sec, "hours", p));
  const area = bound(sec, "area", p);
  const phone = bound(sec, "contact", p);
  const pay = listOf(bound(sec, "pay", p));
  const faq = listOf(bound(sec, "faq", p));
  if (!hours.length && !area && !phone && !pay.length && !faq.length) return null;
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: p.business?.timezone || undefined }).format(new Date());
  return (
    <section className="sec visit" id={sec.id} data-section={sec.id} aria-labelledby={`${sec.id}-title`}>
      <Head sec={sec} />
      <div className="visit-grid">
        {hours.length > 0 && (
          <div className="board" data-part="hours" data-from="hours.week">
            <h3>Hours</h3>
            <table>
              <tbody>
                {MONDAY_FIRST.map((d) => {
                  const h = hours.find((x) => x.weekday === d);
                  const open = h?.open_time && h?.close_time;
                  return (
                    <tr key={d} className={DAYS[d] === today ? "today" : undefined} aria-current={DAYS[d] === today ? "date" : undefined}>
                      <th scope="row">{DAYS[d]}</th>
                      <td>{open ? `${time12(h.open_time)} – ${time12(h.close_time)}` : "Closed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {area && (
          <div className="board" data-part="area" data-from="area">
            <h3>Where</h3>
            {area.text && <p className="big">{area.text}</p>}
            {area.zones.length > 0 && (
              <ul className="zones">
                {area.zones.map((z) => <li key={z.key || z.name}><span>{z.name}</span><b>{Number(z.fee) > 0 ? `+${money(z.fee)} travel` : "No travel fee"}</b></li>)}
              </ul>
            )}
            {area.dropoff && <p className="site-soft">Drop-off: {area.dropoff}</p>}
          </div>
        )}
        {phone && (
          <div className="board" data-part="contact" data-from="contact.phone">
            <h3>Talk to us</h3>
            <p className="big">{phoneText(phone)}</p>
            <div className="row">
              <a className="site-btn" href={`tel:${phone}`}>Call</a>
              <a className="site-btn ghost" href={`sms:${phone}`}>Text</a>
            </div>
          </div>
        )}
        {pay.length > 0 && (
          <div className="board" data-part="pay" data-from="pay">
            <h3>Paying</h3>
            <ul className="pay">{pay.map((m) => (m.key === "other"
              ? <li key={m.key}><span>{m.handle}</span></li>
              : <li key={m.key}><b>{m.label}</b>{m.handle ? <span>{m.handle}</span> : null}</li>))}</ul>
          </div>
        )}
      </div>
      {faq.length > 0 && (
        <div className="faq" data-part="faq" data-from="faq">
          <h3>Questions people ask</h3>
          {faq.map((f) => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ booking
// The EXISTING booking flow (app/src/book), embedded — no iframe, no copy of the
// engine. It reads the same provider the rest of the page reads, so one profile
// request feeds both.
export function Booking({ sec }) {
  return (
    <section className="sec booksec" id={sec.id} data-section={sec.id} aria-labelledby={`${sec.id}-title`}>
      <Head sec={sec} />
      {/* The stamp is on the flow, not the section, so the spec's own title and
          intro above it are still checked for stray digits. */}
      <div data-from="book" data-part="flow"><BookingFlow embedded /></div>
    </section>
  );
}
