// Loading Stripe.js, and dressing it in this product's own clothes.
//
// Roadmap 2.20 stage 2, second pass — the owner picked Stripe's third option
// (2026-09-05): not their hosted page, not that page in an iframe, but Elements,
// where the card fields are Stripe's and everything around them is ours.
// *"so it can look like the rest of the website."*
//
// NO NPM PACKAGE, AND THAT IS NOT AUSTERITY. Stripe requires their script be
// loaded from js.stripe.com and forbids bundling or self-hosting a copy of it —
// it is how they keep PCI scope off your server and how a fix reaches every
// integration the day they ship it. `@stripe/stripe-js` is a ~2 KB wrapper
// around exactly the injection below, and this repo's whole frontend dependency
// list is four packages on purpose.
//
// THE CARD FIELDS ARE STILL AN IFRAME ON STRIPE'S ORIGIN. No card number
// reaches this product, this server, this repo or any log, so the PCI position
// is identical to the hosted page we replaced. What changed is the frame.

const SRC = "https://js.stripe.com/v3/";

let loading = null;

/** Injects Stripe.js once and resolves with `window.Stripe`. */
export function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    // A second <script> for the same src would load Stripe.js twice and leave
    // two copies fighting over the same iframes.
    const existing = document.querySelector(`script[src="${SRC}"]`);
    const el = existing ?? Object.assign(document.createElement("script"), { src: SRC, async: true });
    el.addEventListener("load", () => resolve(window.Stripe));
    el.addEventListener("error", () => {
      loading = null;
      reject(new Error("Could not reach Stripe. Check the connection and try again."));
    });
    if (!existing) document.head.appendChild(el);
  });
  return loading;
}

/**
 * THE APPEARANCE IS READ OFF THE LIVE PAGE, NOT TYPED OUT.
 *
 * Stripe's Appearance API takes concrete values — it cannot resolve `var()`
 * inside an iframe on another origin — so the obvious version is a second
 * hand-written copy of this product's palette, which is the drift the whole
 * design system exists to prevent. Reading the computed values off `<html>` at
 * mount time means the form follows `theme.css`, follows a token rename, and
 * follows the TENANT'S OWN ACCENT, which `lib/theme.js` writes onto the root
 * at runtime and no hardcoded copy could ever know about.
 */
export function appearanceFromTokens() {
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => (css.getPropertyValue(name) || "").trim() || fallback;
  return {
    theme: "night",
    variables: {
      colorPrimary: v("--accent", "#38E08B"),
      colorBackground: v("--surface-sunken", "#111417"),
      colorText: v("--text", "#F2F1EC"),
      colorTextSecondary: v("--text-muted", "#939CA1"),
      colorDanger: v("--bad", "#E2705F"),
      fontFamily: v("--f-body", "Archivo, sans-serif"),
      borderRadius: v("--r-inset", "8px"),
      spacingUnit: "4px",
    },
    rules: {
      // The product's own input: a sunken well with a hairline, not a raised
      // box with a shadow. `theme.css`'s `input` rule, translated.
      ".Input": {
        border: `1px solid ${v("--hairline", "#272D31")}`,
        boxShadow: "none",
        padding: "11px 14px",
      },
      ".Input:focus": {
        border: `1px solid ${v("--accent", "#38E08B")}`,
        boxShadow: "none",
      },
      // The label voice: the uppercase, tracked micro-label every field on
      // every settings screen already uses.
      ".Label": {
        fontSize: "11px",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: v("--text-muted", "#939CA1"),
      },
      ".Tab, .Block": {
        border: `1px solid ${v("--hairline", "#272D31")}`,
        boxShadow: "none",
      },
      ".Tab--selected": {
        border: `1px solid ${v("--accent", "#38E08B")}`,
        boxShadow: "none",
      },
    },
  };
}
