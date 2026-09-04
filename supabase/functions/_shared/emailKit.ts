// THE EMAIL'S HALF OF "THE THREAD" — roadmap 2.18, 2026-09-03.
//
// WHY THIS FILE EXISTS. The owner rendered the emails the product used to send
// and said the true thing: *"it looks exactly the same style as the email
// template i had before. and doesnt even match the style of the websites."* A
// coloured band above a white card is the shape of every transactional email
// ever sent, which makes it the on-distribution default.
//
// ============================================================================
// LIGHT IS THE DEFAULT AND DARK IS THE VARIANT — A MEASURED DECISION
// ============================================================================
//
// The first version of this file was dark-first, because The Thread is a dark
// system and the dark rendering is the better one. **The owner tested it on
// real devices and it failed on Gmail**, which he reported precisely: Apple
// Mail correct in both modes, *"but on the Gmail… it does reverse it when I
// have dark mode activated… it darkened the green somehow."*
//
// **Gmail's app inverts an already-dark email and CANNOT BE TOLD NOT TO.** No
// meta tag, no media query — it ignores `color-scheme` and `prefers-color-scheme`
// alike. That is documented behaviour, not a bug to work around.
//
// AND IT IS NOT COSMETIC. Gmail's transform flips LIGHTNESS and keeps HUE, so
// it was measured against our own palette rather than eyeballed:
//
//   accent as words on the ground     10.07:1  →  **1.99:1**
//   ink on the accent button          10.88:1  →  **1.77:1**
//   the 11px labels                    5.16:1  →   3.68:1
//
// Against a 4.5:1 floor. **The total and the button label become unreadable.**
//
// IT IS UNFIXABLE BY PALETTE, which is why the design moved instead of the
// colours. Inversion barely shifts a mid-lightness accent (green L≈55% → 45%)
// while swinging its near-black ink from L≈8% to L≈92% — so a pair that was
// high-contrast becomes light-on-mid-green. No accent survives that both ways.
//
// **Light-first sidesteps it entirely.** Gmail darkening a LIGHT email is the
// one thing its algorithm is actually tuned for, and it does it competently.
// Apple Mail — ~60% of all opens, and the client the owner was admiring — still
// gets the real dark design through `prefers-color-scheme`, which it honours.
// The coverage is strictly better than dark-first:
//
//   Apple Mail light  → our light design      Apple Mail dark → OUR DARK DESIGN
//   Gmail light       → our light design      Gmail dark      → Gmail's own darkening
//   Outlook Windows   → our light design
//
// HOW THE SWAP IS DONE, and why it degrades safely. Every colour is written
// INLINE as its light value — so a client that strips `<style>`, which several
// do, shows the light design correctly and completely. The dark palette lives
// in ONE `<style>` block keyed on `prefers-color-scheme: dark`, overriding by
// class with `!important` because inline styles otherwise win. **Nothing
// depends on that block surviving.**
//
// ============================================================================
// WHAT THE THREAD IS, AND WHAT SURVIVES INTO AN INBOX
// ============================================================================
//
//   * ONE CONTINUOUS GROUND the reader travels down — not a card floating on
//     grey. Both palettes are the design system's own: `--paper` for light
//     ("warm off-white, never paper white") and `--ink-0` for dark.
//   * NEVER `#ffffff` OR `#000000`. A design law — the system names pure white
//     as a tell — and independently a compatibility one, since Apple Mail
//     reads a pure value as permission to invert the whole email.
//   * ONE ACCENT, marking the thing that has landed: the appointment, the
//     money, the action. Not a header fill, not five links.
//   * A COLLECTION OF RECORDS IS A RULED LIST, never a stack of cards. An
//     itemised total is the cleanest case of that law in the product.
//   * SIZE JUMPS OF 3x. 11px label → 15px body → 34px headline.
//   * CENTRED EXACTLY ONCE, at the end.
//
// **Archivo and JetBrains Mono do not travel** — an email cannot load a
// webfont. But the system's type rule is *one face for everything that is
// words, one face for every figure*, and that shape ports intact to Arial plus
// a monospace stack. **The faces were never the law; the split was.**
//
// EMAIL CONSTRAINTS THIS IS BUILT AROUND: tables, not flex or grid (Outlook's
// Word engine has neither); inline styles, because `<style>` is unreliable;
// `border-radius` and `letter-spacing` ignored by Outlook desktop, and nothing
// depends on either.
//
// BLOCKS, AND THE REASON CHANGED UNDER THEM — WHICH IS WHY THEY STAYED. They
// were the substrate for an editor the owner asked for and scrapped one message
// later. They earn their place now for two better reasons: twelve templates
// come out consistent with each other, and **the plain-text half of every email
// is ONE derived pass over the same markup** rather than twelve twins that
// drift.
//
// `moneyBlock` and `reconcile` are the load-bearing pair: a number printed is
// not a number charged, and an invoice reaches the one person who checks it
// against a card statement.

import {
  emailBrandColors,
  emailDarkBrandColors,
  EMAIL_BONE,
  EMAIL_GROUND,
  EMAIL_PANEL,
  PAPER,
  PAPER_GROUND,
} from "./brandColor.js";

/**
 * THE LIGHT PALETTE — written inline, so it is what every client shows unless
 * it both supports `prefers-color-scheme` AND the reader is in dark mode.
 * Straight from `docs/design-system.md` § The light band.
 */
export const L = {
  ground: PAPER_GROUND,   // --paper  #EFEEE7, warm, never paper white
  panel: PAPER,           // the lifted surface, and what the accent is corrected against
  line: "#D2D1C9",        // --paper-line
  line2: "#C2C1B7",       // a line that has to be seen
  ink: "#12161A",         // --paper-ink, the dominant
  ink2: "#2E3533",        // stepped back
  fog: "#565F64",         // --paper-fog, secondary prose
  fog2: "#5E6870",        // 11–13px labels. 4.51:1 on the panel — THE FLOOR.
  bad: "#B3402F",         // an error, a cancellation. Fixed; never the tenant's.
};

/**
 * THE DARK PALETTE — the `prefers-color-scheme` override only. The Thread's
 * own ground set, and what Apple Mail shows in dark mode.
 */
export const D = {
  ground: EMAIL_GROUND,   // --ink-0
  panel: EMAIL_PANEL,     // --ink-2
  line: "#272D31",        // --line
  line2: "#333B40",       // --line-2
  ink: EMAIL_BONE,        // --bone. Warm. Never #fff.
  ink2: "#CFD2CE",        // --bone-2
  fog: "#939CA1",         // --fog
  fog2: "#7B858A",        // --fog-2. THE FLOOR — do not darken.
  bad: "#E2705F",         // --bad
};

/** What the templates and the render script mean by "the palette": the default. */
export const G = L;

const WORDS = "Arial,Helvetica,sans-serif";
// The figure face. Every one of these ships somewhere and the stack ends at the
// generic, so a figure is monospace on every client that has ever existed.
const FIGS = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

// 32px, not 40. An email column is `width:100%` capped at 600px, so on a 320px
// phone the side padding comes out of the content: 40 each side leaves 240 for
// an address and a right-aligned figure on one row. 32 leaves 256 and still
// reads generous at 600. The system's `--gut` is a `clamp()`, which no email
// client can be trusted with.
const PAD = "padding:0 32px;";

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
  /** Light: the accent as WORDS, 4.5:1 on the panel. */
  accent: string;
  /** Light: the accent as a FILL, 3:1. */
  accentFill: string;
  /** Light: what is legible ON that fill — measured. */
  accentInk: string;
  /** The same three for the dark override. */
  accentDark: string;
  accentFillDark: string;
  accentInkDark: string;
}

export function brandFrom(
  base: { brandName: string; contactPhone: string | null; siteUrl: string; logoUrl?: string | null },
  hex: string | null,
): Brand {
  const l = emailBrandColors(hex || undefined);
  const d = emailDarkBrandColors(hex);
  return {
    ...base,
    logoUrl: base.logoUrl ?? null,
    accent: l.onPaper, accentFill: l.band, accentInk: l.bandInk,
    accentDark: d.text, accentFillDark: d.fill, accentInkDark: d.fillInk,
  };
}

// --- The blocks -------------------------------------------------------------
//
// Every one returns a complete `<tr>` and knows nothing about its neighbours.
// EVERY COLOURED ELEMENT CARRIES BOTH an inline light value AND a class, and
// the class is the only thing the dark override can reach — an element that
// forgets its class stays light inside a dark email, which is the one way this
// design can look broken rather than merely different.

/** An eyebrow. 11px, .22em, uppercase — `.lab` in the system's type scale. */
export function labBlock(text: string, tone: "fog2" | "bad" = "fog2"): string {
  const bad = tone === "bad";
  return `<tr><td class="${bad ? "c-bad" : "c-fog2"}" style="${PAD} padding-top:34px; font-family:${WORDS}; font-size:11px; line-height:1.4; letter-spacing:.22em; text-transform:uppercase; font-weight:bold; color:${bad ? L.bad : L.fog2};">${esc(text)}</td></tr>`;
}

/** The one big thing. 34px, tight leading — a display size wants it. */
export function headlineBlock(text: string): string {
  return `<tr><td class="c-ink" style="${PAD} padding-top:10px; font-family:${WORDS}; font-size:34px; line-height:1.1; letter-spacing:-.02em; font-weight:bold; color:${L.ink};">${esc(text)}</td></tr>`;
}

/** Prose. */
export function proseBlock(html: string, top = 18): string {
  return `<tr><td class="c-ink2" style="${PAD} padding-top:${top}px; font-family:${WORDS}; font-size:15px; line-height:1.65; color:${L.ink2};">${html}</td></tr>`;
}

/** A hairline the width of the column. The system's rule, not a divider. */
export function ruleBlock(top = 30): string {
  return `<tr><td style="${PAD} padding-top:${top}px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="bg-line" style="height:1px; line-height:1px; font-size:0; background-color:${L.line};">&nbsp;</td></tr></table></td></tr>`;
}

/**
 * THE ONE ACCENT MARK: a short rule in the tenant's colour above a line of
 * type — the system's "the thing that has landed". One per email.
 */
export function markBlock(brand: Brand, lines: string[]): string {
  return `<tr><td style="${PAD} padding-top:30px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="bg-accent" bgcolor="${brand.accentFill}" style="width:44px; height:3px; line-height:3px; font-size:0; background-color:${brand.accentFill};">&nbsp;</td>
    </tr></table>
    ${lines.map((l, i) => `<div class="${i === 0 ? "c-ink" : "c-fog"}" style="font-family:${WORDS}; font-size:${i === 0 ? 22 : 15}px; line-height:1.45; font-weight:${i === 0 ? "bold" : "normal"}; color:${i === 0 ? L.ink : L.fog}; margin-top:${i === 0 ? 14 : 4}px;">${l}</div>`).join("")}
  </td></tr>`;
}

/**
 * A ruled list of facts — label left, value right. NOT a card: "a collection of
 * records is a ruled list" is a composition law with its own test.
 */
export function factsBlock(rows: [string, string][]): string {
  const body = rows.map(([k, v], i) => `<tr>
      <td class="c-fog2" style="padding:${i === 0 ? 0 : 11}px 12px 11px 0; font-family:${WORDS}; font-size:13px; line-height:1.5; color:${L.fog2}; vertical-align:top; white-space:nowrap;">${esc(k)}</td>
      <td class="c-ink" style="padding:${i === 0 ? 0 : 11}px 0 11px 0; font-family:${WORDS}; font-size:15px; line-height:1.5; color:${L.ink}; vertical-align:top; text-align:right;">${v}</td>
    </tr>${i < rows.length - 1 ? `<tr><td colspan="2" class="bg-line" style="height:1px; line-height:1px; font-size:0; background-color:${L.line};">&nbsp;</td></tr>` : ""}`).join("");
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
 * THE COLUMN ALWAYS REACHES THE TOTAL, AND IT IS STRUCTURAL RATHER THAN
 * DISCIPLINE.
 *
 * This exists because the opposite shipped. The old invoice's rows summed to
 * `subtotalBase` while its printed total was `final_amount` — past the site
 * sale, past the promo and rounded — so a customer with a promo code received
 * a bill whose figures did not add up, by exactly the discount. No test saw it,
 * because `money-export` ties out the accountant export and `booking-engine`
 * ties out the quote engine: **a tie-out is only a tie-out for the document it
 * names.**
 *
 * Every caller that draws money passes its lines through here against the total
 * it is about to print. Where a real remainder exists and cannot be attributed
 * — rounding, or a site sale whose AMOUNT is not stored on the booking — it is
 * drawn plainly. **An unexplained gap is the defect; a line saying "a discount
 * was applied" is not.**
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

/**
 * Every figure is monospace and right-aligned so the column reads as a column.
 * `render-emails.mjs` asserts on the RENDERED output that the lines reach the
 * total, which is the check the old invoice would have failed.
 */
export function moneyBlock(
  brand: Brand,
  lines: MoneyLine[],
  total: { label: string; amount: number },
): string {
  const row = (l: MoneyLine) => {
    const neg = l.kind === "discount";
    const cls = neg ? "c-accent" : (l.muted ? "c-fog2" : "c-ink2");
    return `<tr>
      <td class="${l.muted ? "c-fog2" : "c-ink2"}" style="padding:9px 12px 9px 0; font-family:${WORDS}; font-size:14px; line-height:1.5; color:${l.muted ? L.fog2 : L.ink2};">${esc(l.label)}</td>
      <td class="${cls}" style="padding:9px 0 9px 0; font-family:${FIGS}; font-size:14px; line-height:1.5; text-align:right; white-space:nowrap; color:${neg ? brand.accent : (l.muted ? L.fog2 : L.ink2)};">${neg ? "&minus;" : ""}${money(Math.abs(l.amount))}</td>
    </tr>`;
  };
  return `<tr><td style="${PAD} padding-top:26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${lines.map(row).join(`<tr><td colspan="2" class="bg-line" style="height:1px; line-height:1px; font-size:0; background-color:${L.line};">&nbsp;</td></tr>`)}
      <tr><td colspan="2" class="bg-line2" style="height:1px; line-height:1px; font-size:0; background-color:${L.line2};">&nbsp;</td></tr>
      <tr>
        <td class="c-fog2" style="padding:16px 12px 0 0; font-family:${WORDS}; font-size:13px; line-height:1.4; letter-spacing:.16em; text-transform:uppercase; font-weight:bold; color:${L.fog2};">${esc(total.label)}</td>
        <td class="c-accent" style="padding:16px 0 0 0; font-family:${FIGS}; font-size:26px; line-height:1.2; font-weight:bold; text-align:right; white-space:nowrap; color:${brand.accent};">${money(total.amount)}</td>
      </tr>
    </table>
  </td></tr>`;
}

/** A quiet aside on a lifted panel. The only box in the design, used sparingly. */
export function noteBlock(html: string): string {
  return `<tr><td style="${PAD} padding-top:26px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${L.panel}" class="bg-panel" style="background-color:${L.panel};"><tr>
      <td class="c-fog bd-line2" style="padding:16px 20px; font-family:${WORDS}; font-size:13px; line-height:1.6; color:${L.fog}; border-left:2px solid ${L.line2};">${html}</td>
    </tr></table>
  </td></tr>`;
}

/** The single action. Filled in the tenant's colour; its ink is measured. */
export function buttonBlock(brand: Brand, label: string, href: string): string {
  return `<tr><td style="${PAD} padding-top:32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="bg-accent" bgcolor="${brand.accentFill}" style="background-color:${brand.accentFill}; border-radius:100px;">
        <a href="${href}" target="_blank" class="c-accent-ink" style="display:inline-block; padding:15px 34px; font-family:${WORDS}; font-size:15px; font-weight:bold; line-height:1; color:${brand.accentInk}; text-decoration:none; border-radius:100px;">${esc(label)}</a>
      </td>
    </tr></table>
  </td></tr>`;
}

/** Fine print. `fog2` is the floor for 11–13px — never fainter. */
export function fineBlock(text: string, top = 20): string {
  return `<tr><td class="c-fog2" style="${PAD} padding-top:${top}px; font-family:${WORDS}; font-size:12px; line-height:1.6; color:${L.fog2};">${esc(text)}</td></tr>`;
}

// --- The shell --------------------------------------------------------------

/**
 * THE MASTHEAD CARRIES THE LOGO, ON A BONE PLATE.
 *
 * A detailer uploads whatever they have, and what they have is almost always
 * dark artwork on a transparent or white background — that is what a logo made
 * for a white website is. **On the DARK palette it would be invisible, and
 * nothing in this repo can ever detect that**: unlike every colour in the
 * product, an arbitrary PNG's contrast cannot be measured. The plate is bone in
 * BOTH palettes, so every possible upload stays legible in both.
 *
 * `business_branding.logo_url` has existed since the first migration and is
 * already drawn on three customer-facing pages; no email carried it until now.
 */
function masthead(brand: Brand): string {
  const name = `<div class="c-ink" style="font-family:${WORDS}; font-size:16px; line-height:1.3; font-weight:bold; letter-spacing:.01em; color:${L.ink};">${esc(brand.brandName)}</div>`;
  if (!brand.logoUrl) return `<tr><td style="${PAD} padding-top:38px;">${name}</td></tr>`;
  return `<tr><td style="${PAD} padding-top:38px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_BONE}" style="background-color:${EMAIL_BONE}; border-radius:8px;"><tr>
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
      <tr><td class="bg-line" style="height:1px; line-height:1px; font-size:0; background-color:${L.line};">&nbsp;</td></tr>
      <tr><td align="center" class="c-fog2" style="padding-top:24px; font-family:${WORDS}; font-size:13px; line-height:1.7; color:${L.fog2};">
        <div class="c-ink2" style="color:${L.ink2}; font-weight:bold;">${esc(brand.brandName)}</div>
        ${brand.contactPhone ? `<div>${esc(brand.contactPhone)}</div>` : ""}
        <div><a href="${brand.siteUrl}" class="c-accent" style="color:${brand.accent}; text-decoration:none;">${esc(host)}</a></div>
        <div style="padding-top:10px; font-size:11px;">Automated message &mdash; reply to reach us.</div>
      </td></tr>
    </table>
  </td></tr>`;
}

/**
 * THE DARK OVERRIDE — one `<style>` block, and the only thing in this file a
 * client is allowed to ignore.
 *
 * Everything else is inline and light, so a client that strips `<style>` (and
 * several do) shows a complete, correct light email. Apple Mail and iOS Mail
 * honour `prefers-color-scheme` and swap in The Thread's real dark ground.
 * `!important` is required because an inline style otherwise wins.
 *
 * `[data-ogsc]` is Outlook.com's dark-mode hook: it rewrites inline colours and
 * exposes the original under that attribute, so the same overrides are repeated
 * there. Outlook desktop ignores both and keeps the light design, which is the
 * correct outcome for it.
 */
function darkStyle(brand: Brand): string {
  const rules = `
    body, .bg-ground { background-color:${D.ground} !important; }
    .bg-panel { background-color:${D.panel} !important; }
    .bg-line { background-color:${D.line} !important; }
    .bg-line2 { background-color:${D.line2} !important; }
    .bd-line2 { border-left-color:${D.line2} !important; }
    .c-ink { color:${D.ink} !important; }
    .c-ink2 { color:${D.ink2} !important; }
    .c-fog { color:${D.fog} !important; }
    .c-fog2 { color:${D.fog2} !important; }
    .c-bad { color:${D.bad} !important; }
    .c-accent { color:${brand.accentDark} !important; }
    .bg-accent { background-color:${brand.accentFillDark} !important; }
    .c-accent-ink { color:${brand.accentInkDark} !important; }`;
  return `<style>
  @media (prefers-color-scheme: dark) {${rules}
  }
  [data-ogsc] body, [data-ogsc] .bg-ground { background-color:${D.ground} !important; }
  [data-ogsc] .bg-panel { background-color:${D.panel} !important; }
  [data-ogsc] .c-ink { color:${D.ink} !important; }
  [data-ogsc] .c-ink2 { color:${D.ink2} !important; }
  [data-ogsc] .c-fog, [data-ogsc] .c-fog2 { color:${D.fog} !important; }
  [data-ogsc] .c-accent { color:${brand.accentDark} !important; }
</style>`;
}

export function shell(brand: Brand, blocks: string[], preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(brand.brandName)}</title>
${darkStyle(brand)}
</head>
<body class="bg-ground" style="margin:0; padding:0; background-color:${L.ground};">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${L.ground}" class="bg-ground" style="background-color:${L.ground};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${L.ground}" class="bg-ground" style="max-width:600px; background-color:${L.ground};">
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
 * Every email was sent HTML-only until 2026-09-03 — a long-standing
 * spam-filter signal, and it applied to every email including the receipt.
 *
 * ONE FUNCTION RATHER THAN TWELVE TWINS. Twins drift, and the first time
 * somebody edits one and not the other they disagree about a price. It reads
 * well because the blocks are structural: every row is a `<tr>` and every
 * figure sits in its own cell, so "label | value, one per line" falls out of
 * the markup rather than being reconstructed from it.
 */
export function htmlToText(html: string): string {
  return String(html)
    .replace(/<div style="display:none[\s\S]*?<\/div>/gi, "")
    .replace(/<(head|style|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) =>
      `${String(inner).replace(/<[^>]+>/g, "").trim()} (${href})`)
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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export { FIGS, PAD, WORDS };
