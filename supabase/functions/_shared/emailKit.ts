// THE EMAIL'S HALF OF "THE THREAD" — roadmap 2.18, 2026-09-03.
//
// WHY THIS FILE REPLACES THE OLD ONE'S LOOK. The owner rendered the existing
// emails and said the true thing: *"it looks exactly the same style as the
// email template i had before. and doesnt even match the style of the websites
// and all the stuff."* He was right, and it was not a small miss — a coloured
// band above a white card is the shape of literally every transactional email
// ever sent, which makes it the definition of on-distribution. The product's
// own world is the opposite of it.
//
// WHAT THE THREAD ACTUALLY IS, and what of it survives into an inbox
// (`docs/design-system.md`):
//
//   * ONE CONTINUOUS COOL-BIASED NEAR-BLACK GROUND the reader travels down.
//     Not a card floating on grey. This is the single biggest difference and
//     it is free — a full-bleed `bgcolor` works in every client including
//     Outlook's Word engine.
//   * WARM BONE TYPE, `#F2F1EC`, **never `#ffffff`**. The system names pure
//     white as a tell. On a near-black ground the warmth is visible and it is
//     most of why this reads as somebody's design rather than a default.
//   * EXACTLY ONE ACCENT, marking the thing that has landed. Not a band, not a
//     header fill, not five links — one mark per email. On a confirmation it
//     marks the appointment; on an invoice it marks the total paid.
//   * A COLLECTION OF RECORDS IS A RULED LIST, never a stack of cards
//     (composition law, and it has its own test). Hairline `#272D31` between
//     rows. An itemised total is exactly that shape.
//   * SIZE JUMPS ARE 3x OR MORE. 11px label → 15px body → 34px headline.
//   * CENTRED EXACTLY ONCE, at the end.
//
// WHAT CANNOT SURVIVE, STATED PLAINLY SO NOBODY FILES IT AS A BUG: **Archivo
// and JetBrains Mono do not travel.** An HTML email cannot load a webfont —
// no `@font-face`, no `<link>` — so the two faces are gone and Arial/Helvetica
// is the only honest stack. **But the TYPE LAW survives the substitution**,
// which is the part that matters: the system's rule is "one face for
// everything that is words, one face for every figure", and this file keeps
// that shape with the two email-safe families. Every figure is monospace and
// right-aligned; every word is Arial. The hierarchy that Archivo's width axis
// carried is carried here by size, tracking and colour instead.
//
// EMAIL CONSTRAINTS THIS FILE IS BUILT AROUND, none of them negotiable:
//   * Tables for layout. No flex, no grid — Outlook's Word engine has neither.
//   * Inline styles. `<style>` blocks are stripped or ignored by enough
//     clients that relying on them is a coin flip.
//   * No `border-radius` in Outlook desktop. Everything here degrades to a
//     square corner and still reads, because the design leans on rules and
//     space rather than on rounded boxes.
//   * `letter-spacing` is ignored by Outlook desktop. The labels lose their
//     tracking there and stay legible; nothing depends on it.
//   * `color-scheme: dark` is declared so Apple Mail and Gmail stop trying to
//     invert a design that is already dark.
//
// BLOCKS, AND THE REASON CHANGED UNDER THEM — WHICH IS WHY THEY STAYED.
// They were built as the substrate for an editor the owner asked for
// ("they can choose whats in it and what order"), and he scrapped that one
// message later: *"scrap the custom email editor thing / make it a lot more
// simple."* Nothing had to be torn out, because the session had stopped at the
// blocks and never written an editor screen.
//
// They earn their place now for two reasons that have nothing to do with an
// editor, and both are better ones:
//
//   * Twelve templates come out short and consistent with each other. Every
//     block is one self-contained `<tr>`; a template is a LIST of them, so the
//     spacing, the rules and the type scale cannot drift between emails the
//     way twelve hand-written layouts would.
//   * **The plain-text half of every email is ONE derived pass over the same
//     markup** (`htmlToText`), not twelve hand-written twins. Twins drift, and
//     the first time somebody edits one and not the other the two disagree
//     about a price. Derived cannot drift.
//
// `moneyBlock` and `reconcile` are the load-bearing pair: CLAUDE.md's rule is
// that a number printed is not a number charged, and an invoice is that risk
// one step further along because it reaches the one person who checks it
// against a card statement.

import { emailDarkBrandColors, EMAIL_BONE, EMAIL_GROUND, EMAIL_PANEL } from "./brandColor.js";

// The ground set, straight from `docs/design-system.md` § Tokens. Named here
// rather than imported as CSS because an edge function has no stylesheet —
// `tests/design-contrast.test.mjs` is what stops these drifting from
// `app/src/theme.css`.
export const G = {
  ground: EMAIL_GROUND,   // --ink-0  the ground everything sits on
  panel: EMAIL_PANEL,     // --ink-2  a lifted surface
  line: "#272D31",        // --line   every hairline
  line2: "#333B40",       // --line-2 a line that has to be seen
  fog: "#939CA1",         // --fog    secondary prose
  fog2: "#7B858A",        // --fog-2  10-13px labels. THE FLOOR — do not darken.
  bone: EMAIL_BONE,       // --bone   the dominant. Warm. Never #fff.
  bone2: "#CFD2CE",       // --bone-2 bone stepped back
  bad: "#E2705F",         // --bad    an error, a cancellation
};

const WORDS = "Arial,Helvetica,sans-serif";
// The figure face. Every one of these ships somewhere; the stack ends at the
// generic so a figure is monospace on every client that has ever existed.
const FIGS = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const money = (n: number) => `$${(Math.round(Number(n) * 100) / 100).toFixed(2)}`;

export const formatTime12hr = (time24: string): string => {
  const [h, m] = String(time24).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

export const formatDateLong = (dateStr: string): string => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
};

export interface Brand {
  brandName: string;
  contactPhone: string | null;
  siteUrl: string;
  logoUrl: string | null;
  /** The tenant's colour as WORDS on the panel — 4.5:1. */
  accent: string;
  /** The tenant's colour as a FILL — 3:1. */
  accentFill: string;
  /** What is legible ON that fill — measured, never assumed. */
  accentInk: string;
}

export function brandFrom(
  base: { brandName: string; contactPhone: string | null; siteUrl: string; logoUrl?: string | null },
  hex: string | null,
): Brand {
  const c = emailDarkBrandColors(hex);
  return { ...base, logoUrl: base.logoUrl ?? null, accent: c.text, accentFill: c.fill, accentInk: c.fillInk };
}

// --- The blocks -------------------------------------------------------------
//
// Every one returns a complete `<tr>`. They are ordered, filtered and fed by
// the template; none of them knows what comes before or after it, which is the
// property the editor needs.

// 32px, not 40. An email column is `width:100%` with a 600px cap, so on a
// 320px phone the side padding comes straight out of the content: 40px each
// side leaves 240px for an address and a right-aligned figure on the same row.
// 32 leaves 256 and still reads generous at 600. The system's own `--gut` is a
// `clamp()`, which no email client can be trusted with.
const PAD = "padding:0 32px;";

/** An eyebrow. 11px, .22em, uppercase — `.lab` in the system's type scale. */
export function labBlock(text: string, color = G.fog2): string {
  return `<tr><td style="${PAD} padding-top:34px; font-family:${WORDS}; font-size:11px; line-height:1.4; letter-spacing:.22em; text-transform:uppercase; font-weight:bold; color:${color};">${esc(text)}</td></tr>`;
}

/** The one big thing. 34px bone, tight leading — a display size wants it. */
export function headlineBlock(text: string): string {
  return `<tr><td style="${PAD} padding-top:10px; font-family:${WORDS}; font-size:34px; line-height:1.1; letter-spacing:-.02em; font-weight:bold; color:${G.bone};">${esc(text)}</td></tr>`;
}

/** Prose. This is the block an editor lets the detailer rewrite. */
export function proseBlock(html: string, top = 18): string {
  return `<tr><td style="${PAD} padding-top:${top}px; font-family:${WORDS}; font-size:15px; line-height:1.65; color:${G.bone2};">${html}</td></tr>`;
}

/** A hairline the full width of the column. The system's rule, not a divider. */
export function ruleBlock(top = 30, color = G.line): string {
  return `<tr><td style="${PAD} padding-top:${top}px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px; line-height:1px; font-size:0; background-color:${color};">&nbsp;</td></tr></table></td></tr>`;
}

/**
 * THE ONE ACCENT MARK. A short rule in the tenant's colour above a line of
 * type — the system's "the thing that has landed". Exactly one per email; a
 * second one is the law broken, not a richer design.
 */
export function markBlock(brand: Brand, lines: string[]): string {
  return `<tr><td style="${PAD} padding-top:30px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="width:44px; height:3px; line-height:3px; font-size:0; background-color:${brand.accentFill};">&nbsp;</td>
    </tr></table>
    ${lines.map((l, i) => `<div style="font-family:${WORDS}; font-size:${i === 0 ? 22 : 15}px; line-height:1.45; font-weight:${i === 0 ? "bold" : "normal"}; color:${i === 0 ? G.bone : G.fog}; margin-top:${i === 0 ? 14 : 4}px;">${l}</div>`).join("")}
  </td></tr>`;
}

/**
 * A ruled list of facts — label left in fog, value right in bone. NOT a card:
 * "a collection of records is a ruled list" is a composition law with its own
 * test, and a fact table is the clearest case of it in the whole product.
 */
export function factsBlock(rows: [string, string][]): string {
  const body = rows.map(([k, v], i) => `<tr>
      <td style="padding:${i === 0 ? 0 : 11}px 12px 11px 0; font-family:${WORDS}; font-size:13px; line-height:1.5; color:${G.fog2}; vertical-align:top; white-space:nowrap;">${esc(k)}</td>
      <td style="padding:${i === 0 ? 0 : 11}px 0 11px 0; font-family:${WORDS}; font-size:15px; line-height:1.5; color:${G.bone}; vertical-align:top; text-align:right;">${v}</td>
    </tr>${i < rows.length - 1 ? `<tr><td colspan="2" style="height:1px; line-height:1px; font-size:0; background-color:${G.line};">&nbsp;</td></tr>` : ""}`).join("");
  return `<tr><td style="${PAD} padding-top:26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}</table></td></tr>`;
}

export interface MoneyLine {
  label: string;
  amount: number;
  /** A discount prints with its sign and in the accent — it is good news. */
  kind?: "charge" | "discount";
  muted?: boolean;
}

/**
 * THE BLOCK THE EDITOR MAY NEVER OPEN.
 *
 * Every figure is monospace and right-aligned so the column reads as a column.
 * The caller passes the lines AND the total, and `render-emails.mjs` asserts
 * that the lines reach the total — because the live invoice does not, and has
 * never, whenever a promo code or a site sale was involved. See CLAUDE.md.
 */
/**
 * THE COLUMN ALWAYS REACHES THE TOTAL, AND IT IS STRUCTURAL RATHER THAN
 * DISCIPLINE.
 *
 * This exists because the opposite shipped. The old invoice's rows summed to
 * `subtotalBase` while its printed total was `final_amount` — past the site
 * sale, past the promo and rounded — so a customer with a promo code received
 * a bill whose figures did not add up, by exactly the discount. It was the
 * `travel_fee` bug's twin and no test saw it, because `money-export` ties out
 * the accountant export and `booking-engine` ties out the quote engine: **a
 * tie-out is only a tie-out for the document it names.**
 *
 * Every caller that draws money passes its lines through here against the
 * total it is about to print, so "the caller remembered to itemise everything"
 * stops being a thing anyone has to remember. Where a real remainder exists
 * and cannot be attributed — rounding, or a site sale whose AMOUNT is not
 * stored on the booking row — it is drawn plainly rather than left as a gap.
 * **An unexplained gap is the defect; a line saying "a discount was applied"
 * is not.**
 *
 * Under a cent, nothing is drawn.
 */
export function reconcile(lines: MoneyLine[], total: number): MoneyLine[] {
  const drawn = lines.reduce((s, l) => s + (l.kind === "discount" ? -Math.abs(l.amount) : l.amount), 0);
  const gap = Math.round((Number(total) - drawn) * 100) / 100;
  if (Math.abs(gap) < 0.01) return lines;
  return [...lines, {
    label: gap < 0 ? "Discount applied" : "Adjustment",
    amount: Math.abs(gap),
    kind: gap < 0 ? "discount" : "charge",
  }];
}

export function moneyBlock(
  brand: Brand,
  lines: MoneyLine[],
  total: { label: string; amount: number },
): string {
  const row = (l: MoneyLine) => {
    const neg = l.kind === "discount";
    return `<tr>
      <td style="padding:9px 12px 9px 0; font-family:${WORDS}; font-size:14px; line-height:1.5; color:${l.muted ? G.fog2 : G.bone2};">${esc(l.label)}</td>
      <td style="padding:9px 0 9px 0; font-family:${FIGS}; font-size:14px; line-height:1.5; text-align:right; white-space:nowrap; color:${neg ? brand.accent : (l.muted ? G.fog2 : G.bone2)};">${neg ? "&minus;" : ""}${money(Math.abs(l.amount))}</td>
    </tr>`;
  };
  return `<tr><td style="${PAD} padding-top:26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${lines.map(row).join(`<tr><td colspan="2" style="height:1px; line-height:1px; font-size:0; background-color:${G.line};">&nbsp;</td></tr>`)}
      <tr><td colspan="2" style="height:1px; line-height:1px; font-size:0; background-color:${G.line2}; padding-top:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:16px 12px 0 0; font-family:${WORDS}; font-size:13px; line-height:1.4; letter-spacing:.16em; text-transform:uppercase; font-weight:bold; color:${G.fog2};">${esc(total.label)}</td>
        <td style="padding:16px 0 0 0; font-family:${FIGS}; font-size:26px; line-height:1.2; font-weight:bold; text-align:right; white-space:nowrap; color:${brand.accent};">${money(total.amount)}</td>
      </tr>
    </table>
  </td></tr>`;
}

/** A quiet aside on a lifted panel. The only box in the design, used sparingly. */
export function noteBlock(html: string): string {
  return `<tr><td style="${PAD} padding-top:26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${G.panel}" style="background-color:${G.panel};"><tr>
      <td style="padding:16px 20px; font-family:${WORDS}; font-size:13px; line-height:1.6; color:${G.fog}; border-left:2px solid ${G.line2};">${html}</td>
    </tr></table>
  </td></tr>`;
}

/** The single action. Filled in the tenant's colour; its ink is measured. */
export function buttonBlock(brand: Brand, label: string, href: string): string {
  return `<tr><td style="${PAD} padding-top:32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background-color:${brand.accentFill}; border-radius:100px;">
        <a href="${href}" target="_blank" style="display:inline-block; padding:15px 34px; font-family:${WORDS}; font-size:15px; font-weight:bold; line-height:1; color:${brand.accentInk}; text-decoration:none; border-radius:100px;">${esc(label)}</a>
      </td>
    </tr></table>
  </td></tr>`;
}

/** Fine print. `--fog-2` is the floor for 10-13px — never darker. */
export function fineBlock(text: string, top = 20): string {
  return `<tr><td style="${PAD} padding-top:${top}px; font-family:${WORDS}; font-size:12px; line-height:1.6; color:${G.fog2};">${esc(text)}</td></tr>`;
}

// --- The shell --------------------------------------------------------------

/**
 * THE MASTHEAD CARRIES THE LOGO, AND IT SITS ON THE GROUND RATHER THAN ON A
 * COLOURED BAND. That was a live question put to the owner: a logo is an
 * arbitrary PNG somebody uploaded, so unlike every other colour in this
 * product its contrast cannot be measured. On the ground it is safe for every
 * logo anyone will ever upload; on a band of the tenant's own colour it is a
 * guess nothing in the repo can check.
 *
 * `business_branding.logo_url` has existed the whole time and is already drawn
 * on the booking page, the confirmation page and the manage page. No email has
 * ever carried it. It falls back to the business name set in bone.
 */
function masthead(brand: Brand): string {
  const name = `<div style="font-family:${WORDS}; font-size:16px; line-height:1.3; font-weight:bold; letter-spacing:.01em; color:${G.bone};">${esc(brand.brandName)}</div>`;
  if (!brand.logoUrl) return `<tr><td style="${PAD} padding-top:38px;">${name}</td></tr>`;

  // THE LOGO SITS ON A BONE PLATE, AND IT IS NOT A STYLE PREFERENCE.
  //
  // A detailer uploads whatever they have, and what they have is almost always
  // dark artwork on a transparent or white background — that is what a logo
  // made for a white website is. Dropped straight onto `--ink-0` it is
  // invisible, and nothing in this repo can detect that: unlike every colour
  // in the product, an arbitrary PNG's contrast cannot be measured, which is
  // exactly why the logo went on the ground rather than on a tenant-coloured
  // band in the first place. The plate makes EVERY possible upload legible,
  // including the light-on-transparent one that would have been fine anyway.
  //
  // It reads as a deliberate object rather than a mistake — the one light
  // element on a dark page, which is a shape this design system already uses.
  return `<tr><td style="${PAD} padding-top:38px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${G.bone}" style="background-color:${G.bone}; border-radius:8px;"><tr>
      <td style="padding:12px 16px;">
        <img src="${brand.logoUrl}" alt="${esc(brand.brandName)}" height="30" style="height:30px; width:auto; max-width:220px; border:0; display:block;">
      </td>
    </tr></table>
  </td></tr>`;
}

function footer(brand: Brand): string {
  const host = brand.siteUrl.replace(/^https?:\/\//, "");
  // Centred exactly once, at the end — the composition law, spent here.
  return `<tr><td style="${PAD} padding-top:44px; padding-bottom:44px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="height:1px; line-height:1px; font-size:0; background-color:${G.line};">&nbsp;</td></tr>
      <tr><td align="center" style="padding-top:24px; font-family:${WORDS}; font-size:13px; line-height:1.7; color:${G.fog2};">
        <div style="color:${G.bone2}; font-weight:bold;">${esc(brand.brandName)}</div>
        ${brand.contactPhone ? `<div>${esc(brand.contactPhone)}</div>` : ""}
        <div><a href="${brand.siteUrl}" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a></div>
        <div style="padding-top:10px; font-size:11px;">Automated message &mdash; reply to reach us.</div>
      </td></tr>
    </table>
  </td></tr>`;
}

/**
 * The ground, edge to edge. `bgcolor` on the outer table as well as the inline
 * style, because Outlook's Word engine reads the attribute and not always the
 * property — and a dark design that loses its ground becomes bone-on-white,
 * which is unreadable rather than merely wrong.
 */
export function shell(brand: Brand, blocks: string[], preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(brand.brandName)}</title>
</head>
<body style="margin:0; padding:0; background-color:${G.ground};">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${G.ground}" style="background-color:${G.ground};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${G.ground}" style="max-width:600px; background-color:${G.ground};">
      ${masthead(brand)}
      ${blocks.join("\n      ")}
      ${footer(brand)}
    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * THE PLAIN-TEXT HALF, DERIVED RATHER THAN HAND-WRITTEN.
 *
 * Every email in this product was sent HTML-only until 2026-09-03 — the Resend
 * payload set `html` and nothing else. An HTML-only message with no text
 * alternative is a long-standing spam-filter signal, and it applied to every
 * email including the receipt, which is the one that must never land in junk.
 * Found while answering "will it work globally", by following the question
 * past the templates and into the sender. `docs/email-clients-2026-09-03.md`.
 *
 * ONE FUNCTION RATHER THAN TWELVE TWINS, and that is the whole design decision
 * here. A hand-written text version of each template is twelve more things to
 * keep in step with twelve HTML ones, and the first time somebody edits one
 * and not the other the two disagree about a price. Deriving it means the text
 * half cannot drift, because there is nothing to drift from.
 *
 * It reads well because the blocks above are structural: every row is a `<tr>`
 * and every figure sits in its own cell, so "one block per line, label then
 * value" falls out of the markup rather than being reconstructed from it.
 */
export function htmlToText(html: string): string {
  return String(html)
    // The preheader is a hidden duplicate of the first line. In text it is
    // just the first line printed twice.
    .replace(/<div style="display:none[\s\S]*?<\/div>/gi, "")
    .replace(/<(head|style|title)[\s\S]*?<\/\1>/gi, "")
    // A link becomes "text (url)" — a text reader cannot click a bare label.
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) =>
      `${String(inner).replace(/<[^>]+>/g, "").trim()} (${href})`)
    // A table cell is a column; two cells on one row are "label: value".
    .replace(/<\/td>\s*<td[^>]*>/gi, "  |  ")
    .replace(/<\/(tr|div|p|h1|h2|h3|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&middot;/g, "·").replace(/&minus;/g, "-").replace(/&rsquo;/g, "'")
    .replace(/&times;/g, "x").replace(/&rarr;/g, "->")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean)
    .join("\n")
    // A blank line between blocks, never three.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export { FIGS, PAD, WORDS };
