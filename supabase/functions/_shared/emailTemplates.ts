// Tenant-branded email templates. Every business-specific value (name,
// phone, addresses, review links, colors, site URL) is a template variable —
// nothing about any particular detailer is hardcoded here.
//
// This module is dependency-free (no Deno/DB imports) so the routing and
// rendering logic can be tested under plain Node.
//
// ARIAL IS DELIBERATE HERE AND NOWHERE ELSE. An HTML email cannot load a
// webfont — no @font-face, no <link> to Google Fonts — so Arial/Helvetica is
// the email-safe stack and this is the one file in the product allowed to name
// it. The product's own two faces (Archivo, JetBrains Mono) are unaffected and
// are pinned by `tests/composition.test.mjs`. The design hook flags every one
// of these as an overused font; the suppression is scoped to this FILE so that
// Arial in a stylesheet a browser actually renders is still caught. The
// reasoning is written here because `.impeccable/config.json` is untracked on
// purpose (.gitignore, and CLAUDE.md's rule that no tool-specific mechanism may
// carry a decision).

export interface TenantBrand {
  businessId: string;
  slug: string;
  brandName: string;
  contactEmail: string | null;  // becomes Reply-To; also where owner mail goes
  contactPhone: string | null;
  dropoffAddress: string | null;
  siteUrl: string;
  // THREE VALUES, ONE TENANT COLOUR, AND EACH NAMES THE GROUND IT LANDS ON.
  // A tenant has ONE accent (law 11); the second brand colour was a schema
  // accident and it drew a 3px rule on a band of its own colour -- 1:1, the
  // worst defect on step 4s list. _shared/brandColor.js computes all three
  // and says why each ground is the one it is.
  primaryColor: string;         // the header bands FILL, corrected 3:1 on paper
  headerInk: string;            // what is legible ON that band -- measured, never assumed
  accentColor: string;          // the same colour as WORDS on white paper, 4.5:1
  googleReviewUrl: string | null;
  yelpReviewUrl: string | null;
  paymentMethodsLine: string | null; // e.g. "Cash, Venmo & Zelle" (optional)
}

export interface MailAddressing {
  from: string;      // "Brand Name <bookings@platform-domain>"
  replyTo: string | null;
  ownerTo: string | null; // where owner notifications go
}

// One place decides how tenant mail is addressed: sent FROM the platform's
// verified domain with the tenant's brand as display name, replies go to the
// tenant, owner copies go to the tenant's contact address. Never another
// business's.
export function buildAddressing(brand: TenantBrand, platformFromAddress: string): MailAddressing {
  return {
    from: `${brand.brandName.replace(/[<>]/g, "")} <${platformFromAddress}>`,
    replyTo: brand.contactEmail,
    ownerTo: brand.contactEmail,
  };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const formatTime12hr = (time24: string): string => {
  const [hours, minutes] = String(time24).substring(0, 5).split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minutes} ${ampm}`;
};

export const formatDateLong = (dateStr: string): string => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const rest = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `${weekday}, ${rest}`;
};

export const money = (n: number) => `$${(Math.round(Number(n) * 100) / 100).toFixed(2)}`;

// Callers pass bookings.vehicle_size_label where it exists — the label the
// detailer had at booking time. This is the fallback for rows taken before
// that column existed, and for a detailer whose size keys are slugs of their
// own words ("pickup-truck" reads as "Pickup truck", not "Pickup-truck").
const sizeDisplay = (size: string) => {
  if (!size) return "Unknown";
  const words = size.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Shared shell: header band in the tenant's primary color, white card, footer
// with the tenant's name and site link.
function shell(brand: TenantBrand, headerHtml: string, bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(brand.brandName)}</title></head>
<body style="margin:0; padding:0; background-color:#eef2f6;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden;">
        <tr><td style="background-color:${brand.primaryColor}; padding:28px 32px;">
          <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:${brand.headerInk};">${esc(brand.brandName)}</div>
          <div style="height:3px; width:44px; background-color:${brand.headerInk}; margin:12px 0 14px 0; border-radius:2px;"></div>
          ${headerHtml}
        </td></tr>
        ${bodyHtml}
        <tr><td style="padding:24px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
          <div style="border-top:1px solid #eef2f6; padding-top:20px;">
            <p style="margin:0 0 4px 0; font-size:14px; font-weight:bold; color:${brand.accentColor};">${esc(brand.brandName)}</p>
            ${brand.contactPhone ? `<p style="margin:0 0 4px 0; font-size:13px; color:#63738a;">${esc(brand.contactPhone)}</p>` : ""}
            <p style="margin:0 0 10px 0; font-size:13px; color:#63738a;"><a href="${brand.siteUrl}" style="color:${brand.accentColor}; text-decoration:none;">${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
            <p style="margin:0; font-size:11px; color:#6a7179;">Automated message — reply to reach us.</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const label = (accent: string, text: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:${accent}; font-weight:bold; margin-bottom:10px;">${esc(text)}</div>`;

const infoCard = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px;"><tr><td style="padding:18px 20px; font-family:Arial,Helvetica,sans-serif;">${inner}</td></tr></table>`;

const kv = (k: string, v: string, bold = false) =>
  `<tr><td style="padding:5px 0; color:#63738a; width:120px; vertical-align:top; font-size:14px;">${esc(k)}</td><td style="padding:5px 0; vertical-align:top; font-size:14px; color:#0f172a; ${bold ? "font-weight:bold;" : ""}">${v}</td></tr>`;

export interface BookingEmailData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  dateStr: string;       // business-local "YYYY-MM-DD"
  startTime: string;     // business-local "HH:MM"
  endTime: string;       // business-local "HH:MM"
  serviceType: string;   // mobile | dropoff
  vehicleSize: string;
  vehicleModel: string | null;
  customerNotes: string | null;
  serviceNames: string[];
  addOnNames: string[];
  // Roadmap 2.8c. The subtotal below now CONTAINS the travel charge and every
  // surcharge, so without these two the money table shows "Express Wash $65"
  // and "Subtotal $105" with $40 unexplained between them. A total that does
  // not reconcile with its own itemisation is the kind of thing a customer
  // rings up about.
  travelFee?: number;
  travelZone?: string | null;
  adjustments?: { label: string; amount: number }[];
  subtotal: number;
  siteDiscount: number;
  siteDiscountPercent: number;
  promoCode: string | null;
  promoDiscount: number;
  total: number;
  receiptUrl: string;
}

// Where the job happens: the customer's address for mobile, the business's
// drop-off address otherwise.
export function jobAddress(brand: TenantBrand, b: Pick<BookingEmailData, "serviceType" | "customerAddress">): string {
  if (b.serviceType === "mobile" && b.customerAddress?.trim()) return b.customerAddress;
  return brand.dropoffAddress || "";
}

// ROADMAP 2.12 — ONE TEMPLATE, TWO PROMISES. `isRequest` is the tenant's
// `booking_mode`, and it changes four sentences and nothing else: the same
// appointment, the same money, the same slot held. That is the owner's own
// framing — "one is just a little bit more guaranteed than the other" — and
// building it as a second 50-line template would be two places to fix the day
// the money table changes. Where the two differ is listed below rather than
// scattered: the header, the opening line, the note under the appointment
// card, and the subject.
export function customerConfirmationEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  isRequest = false,
): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const services = [...b.serviceNames.map((s) => esc(s)), ...b.addOnNames.map((a) => `Add-on: ${esc(a)}`)];
  const body = `
    <tr><td style="padding:28px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0; font-size:16px; color:#0f172a; font-weight:bold;">Hi ${esc(b.customerName)},</p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">${isRequest
        ? "Thanks for asking &mdash; we&rsquo;ve got your request and we&rsquo;re holding this time while we look at it. Here&rsquo;s what you asked for."
        : "Thanks for booking with us. Here are the details of your appointment."}</p>
    </td></tr>
    <tr><td style="padding:20px 32px 4px 32px;">${infoCard(`
      ${label(brand.accentColor, "Appointment")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${kv("Date", esc(dateLong), true)}
        ${kv("Time", `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`, true)}
        ${kv("Service type", b.serviceType === "mobile" ? "Mobile (we come to you)" : "Drop-off")}
        ${kv("Vehicle", `${esc(sizeDisplay(b.vehicleSize))}${b.vehicleModel ? ` &middot; ${esc(b.vehicleModel)}` : ""}`)}
        ${kv(b.serviceType === "mobile" ? "Address" : "Drop-off", esc(jobAddress(brand, b)))}
      </table>
      <p style="margin:12px 0 0 0; font-size:12px; line-height:1.5; color:#687281;">${isRequest
        ? "Nobody else can take this time while we decide. You&rsquo;ll get another email as soon as we&rsquo;ve accepted it."
        : "Your appointment time is approximate &mdash; we aim to arrive within about 30 minutes of it."}</p>
    `)}</td></tr>
    <tr><td style="padding:20px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Services")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
        ${services.map((s) => `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">${s}</td></tr>`).join("")}
      </table>
    </td></tr>
    <tr><td style="padding:20px 32px 4px 32px;">${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
        ${Number(b.travelFee) > 0 ? `<tr><td style="padding:4px 0; color:#63738a;">${b.travelZone ? `Travel &mdash; ${esc(b.travelZone)}` : "Travel"}</td><td style="padding:4px 0; text-align:right;">${money(Number(b.travelFee))}</td></tr>` : ""}
        ${(b.adjustments ?? []).map((a) => `<tr><td style="padding:4px 0; color:#63738a;">${esc(a.label)}</td><td style="padding:4px 0; text-align:right;">${money(Number(a.amount))}</td></tr>`).join("")}
        <tr><td style="padding:4px 0; color:#63738a;">Subtotal</td><td style="padding:4px 0; text-align:right;">${money(b.subtotal)}</td></tr>
        ${b.siteDiscount > 0 ? `<tr><td style="padding:4px 0; color:#63738a;">${b.siteDiscountPercent}% Sale</td><td style="padding:4px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">-${money(b.siteDiscount)}</td></tr>` : ""}
        ${b.promoCode ? `<tr><td style="padding:4px 0; color:#63738a;">Promo (${esc(b.promoCode)})</td><td style="padding:4px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">${b.promoDiscount > 0 ? `-${money(b.promoDiscount)}` : "Applied"}</td></tr>` : ""}
        <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid #dbe4ec;"></div></td></tr>
        <tr><td style="padding:8px 0 0 0; font-size:16px; font-weight:bold; color:${brand.accentColor};">Estimated total</td><td style="padding:8px 0 0 0; text-align:right; font-size:20px; font-weight:bold; color:${brand.accentColor};">${money(b.total)}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; font-size:12px; line-height:1.5; color:#687281;">This total is an estimate and may change if the vehicle&rsquo;s condition requires additional time or services.</p>
    `)}</td></tr>
    <tr><td style="padding:24px 32px 8px 32px;" align="center">
      <a href="${b.receiptUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; background-color:${brand.accentColor}; text-decoration:none; border-radius:10px;">${isRequest ? "View or change your request" : "View / save your confirmation"}</a>
    </td></tr>
    ${b.customerNotes ? `<tr><td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">${label(brand.accentColor, "Your notes")}<p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">${esc(b.customerNotes)}</p></td></tr>` : ""}
    ${brand.paymentMethodsLine ? `<tr><td style="padding:20px 32px 8px 32px;"><div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;"><strong style="color:${brand.accentColor};">Payments accepted:</strong> ${esc(brand.paymentMethodsLine)}</div></td></tr>` : ""}
  `;
  const header = isRequest
    ? `<div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:${brand.headerInk};">Request received</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:bold; color:${brand.headerInk}; margin-top:4px;">We're holding your time</div>`
    : `<div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:${brand.headerInk};">Booking confirmed</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:bold; color:${brand.headerInk}; margin-top:4px;">You're all set!</div>`;
  return {
    subject: isRequest
      ? `Request received - ${formatDateLong(b.dateStr)} | ${brand.brandName}`
      : `Booking confirmed - ${formatDateLong(b.dateStr)} | ${brand.brandName}`,
    html: shell(
      brand, header, body,
      isRequest
        ? `${brand.brandName} has your request for ${dateLong} and is holding the time.`
        : `Your booking with ${brand.brandName} is confirmed for ${dateLong}.`,
    ),
  };
}

export function ownerNewBookingEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  isRequest = false,
): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const services = [...b.serviceNames.map((s) => esc(s)), ...b.addOnNames.map((a) => `Add-on: ${esc(a)}`)];
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:${brand.headerInk}; font-weight:bold;">${isRequest ? "Waiting for you to accept" : "New booking received"}</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:${brand.headerInk}; margin-top:6px;">${esc(b.customerName)}</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:${brand.headerInk}; margin-top:4px;">${esc(dateLong)} &middot; ${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}</div>`;
  const body = `
    <tr><td style="padding:20px 28px 4px 28px;">${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#63738a;">Booking total</td>
        <td style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.accentColor}; text-align:right;">${money(b.total)}</td>
      </tr></table>`)}
    </td></tr>
    <tr><td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Customer")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${kv("Name", esc(b.customerName), true)}
        ${kv("Phone", esc(b.customerPhone), true)}
        ${b.customerEmail ? kv("Email", esc(b.customerEmail)) : ""}
        ${kv("Address", esc(jobAddress(brand, b)))}
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Service")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${kv("Type", b.serviceType === "mobile" ? "Mobile" : "Drop-off")}
        ${kv("Vehicle", `${esc(sizeDisplay(b.vehicleSize))}${b.vehicleModel ? ` &middot; ${esc(b.vehicleModel)}` : ""}`)}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a; margin-top:8px;">
        ${services.map((s) => `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">${s}</td></tr>`).join("")}
        ${b.promoCode ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Promo: ${esc(b.promoCode)}${b.promoDiscount > 0 ? ` (-${money(b.promoDiscount)})` : ""}</td></tr>` : ""}
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 8px 28px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Notes")}
      <p style="margin:0; font-size:14px; line-height:1.6; color:${b.customerNotes ? "#0f172a" : "#687281"};">${esc(b.customerNotes || "None")}</p>
    </td></tr>`;
  return {
    subject: isRequest
      ? `Request - ${b.customerName} - ${dateLong} (${money(b.total)})`
      : `New booking - ${b.customerName} - ${dateLong} (${money(b.total)})`,
    html: shell(brand, header, body, `${b.customerName} · ${dateLong} · ${money(b.total)}`),
  };
}

// ROADMAP 2.12 — THE DETAILER'S ANSWER TO A REQUEST. Three outcomes, one
// template, because the three share a shape: what was asked for, what the
// answer is, and one way forward. The quote is the only one that carries a
// number, and it is the only one with a button, because it is the only one
// still waiting on the customer.
//
// `manageUrl` is the receipt page — the same UUID-as-credential link the
// confirmation email already sends. Accepting a quote happens there.
export function requestDecisionEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  kind: "accepted" | "declined" | "quote",
  opts: { manageUrl: string; quotedAmount?: number; quotedNote?: string | null } = { manageUrl: "" },
): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const whenLine = `<strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)}</strong>`;
  const headline = kind === "accepted"
    ? "You're booked in"
    : kind === "declined"
      ? "We can't make that one"
      : "Here's your price";
  const header =
    `<div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:${brand.headerInk};">${
      kind === "quote" ? "Quote" : kind === "accepted" ? "Request accepted" : "Request declined"
    }</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:bold; color:${brand.headerInk}; margin-top:4px;">${headline}</div>`;

  const lead = kind === "accepted"
    ? `<p style="margin:0 0 12px 0;">Good news &mdash; we&rsquo;ve accepted your request for ${whenLine}. It&rsquo;s in the diary.</p>`
    : kind === "declined"
      ? `<p style="margin:0 0 12px 0;">We&rsquo;re sorry &mdash; we can&rsquo;t take ${whenLine}, so we&rsquo;ve let that time go.</p>`
      : `<p style="margin:0 0 12px 0;">We&rsquo;ve had a look at what you asked for on ${whenLine}, and here&rsquo;s what we can do it for.</p>`;

  const quoteCard = kind === "quote"
    ? `<tr><td style="padding:8px 32px 4px 32px;">${infoCard(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#63738a;">Our price</td>
            <td style="font-family:Arial,Helvetica,sans-serif; font-size:24px; font-weight:bold; color:${brand.accentColor}; text-align:right;">${money(Number(opts.quotedAmount ?? 0))}</td>
          </tr>
        </table>
        ${opts.quotedNote
          ? `<p style="margin:12px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#0f172a;">${esc(opts.quotedNote)}</p>`
          : ""}
        <p style="margin:12px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#687281;">We&rsquo;re still holding ${esc(dateLong)} at ${formatTime12hr(b.startTime)} for you. Nothing is charged until you say yes.</p>
      `)}</td></tr>
      <tr><td style="padding:20px 32px 8px 32px;" align="center">
        <a href="${opts.manageUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; background-color:${brand.accentColor}; text-decoration:none; border-radius:10px;">See it and say yes</a>
      </td></tr>`
    : "";

  const tail = kind === "accepted"
    ? `<p style="margin:0;">Need to move it or cancel? <a href="${opts.manageUrl}" style="color:${brand.accentColor};">Manage your booking</a>.</p>`
    : kind === "declined"
      ? `<p style="margin:0;">If another day works, we&rsquo;d still love to see you &mdash; <a href="${brand.siteUrl}" style="color:${brand.accentColor};">${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}</a>.</p>`
      : "";

  const body = `
    <tr><td style="padding:28px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      <p style="margin:0 0 12px 0;">Hi ${esc(b.customerName)},</p>
      ${lead}
      ${tail}
    </td></tr>
    ${quoteCard}`;

  const subject = kind === "accepted"
    ? `You're booked in - ${dateLong} | ${brand.brandName}`
    : kind === "declined"
      ? `About your request for ${dateLong} | ${brand.brandName}`
      : `Your price: ${money(Number(opts.quotedAmount ?? 0))} for ${dateLong} | ${brand.brandName}`;

  return { subject, html: shell(brand, header, body, `${headline} — ${dateLong}`) };
}

export interface InvoiceRow {
  label: string;
  qty: number;
  lineTotal: number;
  kind: "charge" | "discount" | "tip";
}

export function invoiceEmail(
  brand: TenantBrand,
  b: BookingEmailData,
  rows: InvoiceRow[],
  totals: { chargesSubtotal: number; discountsTotal: number; tipTotal: number; totalPaid: number },
  paymentStatus: string,
  paymentNotes: string | null,
): { subject: string; html: string } {
  const invoiceRef = String(b.id).split("-")[0].toUpperCase();
  const paidLabel = paymentStatus === "paid" ? "PAID" : String(paymentStatus || "").toUpperCase();
  const rowHtml = rows
    .map((r) => {
      const isNeg = r.lineTotal < 0;
      return `<tr>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; color:#0f172a;">${esc(r.label)}${r.qty > 1 ? ` <span style="color:#687281;">&times;${r.qty}</span>` : ""}</td>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; text-align:right; color:${isNeg ? brand.accentColor : "#0f172a"}; font-weight:${isNeg ? "bold" : "normal"}; white-space:nowrap;">${isNeg ? "-" : ""}${money(Math.abs(r.lineTotal))}</td>
      </tr>`;
    })
    .join("");
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:${brand.headerInk}; font-weight:bold;">Invoice / Receipt</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${brand.headerInk}; margin-top:6px;">Ref #${invoiceRef}</div>
    ${paidLabel ? `<div style="display:inline-block; margin-top:10px; padding:4px 12px; background-color:${brand.accentColor}; border-radius:20px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; color:#ffffff; letter-spacing:1px;">${paidLabel}</div>` : ""}`;
  const body = `
    <tr><td style="padding:26px 32px 6px 32px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Billed to")}
      <div style="font-size:15px; font-weight:bold; color:#0f172a;">${esc(b.customerName)}</div>
      ${b.customerEmail ? `<div style="font-size:13px; color:#63738a; margin-top:3px;">${esc(b.customerEmail)}</div>` : ""}
      <div style="font-size:13px; color:#63738a; margin-top:6px;">${esc(formatDateLong(b.dateStr))} &middot; ${formatTime12hr(b.startTime)} &middot; ${b.serviceType === "mobile" ? "Mobile" : "Drop-off"}</div>
    </td></tr>
    <tr><td style="padding:22px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#687281; font-weight:bold; border-bottom:2px solid #dbe4ec;">Description</td>
          <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#687281; font-weight:bold; text-align:right; border-bottom:2px solid #dbe4ec;">Amount</td>
        </tr>
        ${rowHtml}
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td></td><td style="width:260px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
          <tr><td style="padding:5px 0; color:#63738a;">Subtotal</td><td style="padding:5px 0; text-align:right;">${money(totals.chargesSubtotal)}</td></tr>
          ${totals.discountsTotal < 0 ? `<tr><td style="padding:5px 0; color:#63738a;">Discounts</td><td style="padding:5px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">-${money(Math.abs(totals.discountsTotal))}</td></tr>` : ""}
          ${totals.tipTotal > 0 ? `<tr><td style="padding:5px 0; color:#63738a;">Tip</td><td style="padding:5px 0; text-align:right;">${money(totals.tipTotal)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid ${brand.accentColor};"></div></td></tr>
          <tr><td style="padding:10px 0 0 0; font-size:16px; font-weight:bold; color:${brand.accentColor};">Total paid</td><td style="padding:10px 0 0 0; text-align:right; font-size:22px; font-weight:bold; color:${brand.accentColor};">${money(totals.totalPaid)}</td></tr>
        </table>
      </td></tr></table>
    </td></tr>
    ${brand.paymentMethodsLine ? `<tr><td style="padding:20px 32px 4px 32px;"><div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;"><strong style="color:${brand.accentColor};">Payments accepted:</strong> ${esc(brand.paymentMethodsLine)}</div></td></tr>` : ""}
    ${paymentNotes ? `<tr><td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">${label(brand.accentColor, "Notes")}<p style="margin:0; font-size:13px; line-height:1.6; color:#475569;">${esc(paymentNotes)}</p></td></tr>` : ""}`;
  return {
    subject: `Your invoice from ${brand.brandName} - ${money(totals.totalPaid)} (Ref #${invoiceRef})`,
    html: shell(brand, header, body, `Your invoice from ${brand.brandName} — total paid ${money(totals.totalPaid)}.`),
  };
}

// Post-service thank-you / review request. The old referral & loyalty blurb
// is intentionally gone (the referral system was removed platform-wide).
export function followupEmail(brand: TenantBrand, firstName: string): { subject: string; html: string } {
  const reviewLinks = [
    brand.googleReviewUrl ? `<li style="margin-bottom:8px;"><a href="${brand.googleReviewUrl}" style="color:${brand.accentColor}; text-decoration:underline;">Google Review</a></li>` : "",
    brand.yelpReviewUrl ? `<li><a href="${brand.yelpReviewUrl}" style="color:${brand.accentColor}; text-decoration:underline;">Yelp Review</a></li>` : "",
  ].join("");
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.headerInk};">Thank you!</div>`;
  const body = `
    <tr><td style="padding:28px 32px 24px 32px; font-family:Arial,Helvetica,sans-serif; color:#0f172a; font-size:15px; line-height:1.7;">
      <p style="margin:0 0 16px 0;">Hello ${esc(firstName)},</p>
      <p style="margin:0 0 16px 0;">Thank you for choosing ${esc(brand.brandName)} for your recent service. We appreciate the opportunity to take care of your vehicle.</p>
      ${reviewLinks ? `<p style="margin:0 0 12px 0;">If you were happy with your service, we'd greatly appreciate a quick review:</p><ul style="margin:0 0 16px 24px; padding:0;">${reviewLinks}</ul>` : ""}
      <p style="margin:0;">Thank you again for your trust and support.</p>
    </td></tr>`;
  return {
    subject: `Thank you for choosing ${brand.brandName}`,
    html: shell(brand, header, body, `Thank you from ${brand.brandName}`),
  };
}

// Customer appointment reminder (the settings-driven sweep sends this).
export function customerReminderEmail(brand: TenantBrand, b: BookingEmailData): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.headerInk};">See you soon!</div>`;
  const body = `
    <tr><td style="padding:28px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0; font-size:16px; color:#0f172a; font-weight:bold;">Hi ${esc(b.customerName)},</p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">A quick reminder about your upcoming appointment with ${esc(brand.brandName)}.</p>
    </td></tr>
    <tr><td style="padding:20px 32px 16px 32px;">${infoCard(`
      ${label(brand.accentColor, "Appointment")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${kv("Date", esc(dateLong), true)}
        ${kv("Time", `${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}`, true)}
        ${kv("Type", b.serviceType === "mobile" ? "Mobile (we come to you)" : "Drop-off")}
        ${kv(b.serviceType === "mobile" ? "Address" : "Drop-off", esc(jobAddress(brand, b)))}
      </table>`)}
    </td></tr>`;
  return {
    subject: `Reminder: your appointment ${dateLong} | ${brand.brandName}`,
    html: shell(brand, header, body, `Reminder: ${dateLong} at ${formatTime12hr(b.startTime)}`),
  };
}

export function cancellationEmail(brand: TenantBrand, b: BookingEmailData, forOwner: boolean): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.headerInk};">Booking cancelled</div>`;
  const body = `
    <tr><td style="padding:28px 32px 16px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      ${forOwner
        ? `<p style="margin:0 0 12px 0;"><strong>${esc(b.customerName)}</strong> cancelled their booking for <strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)}</strong>.</p><p style="margin:0; color:#63738a;">The slot is open again.</p>`
        : `<p style="margin:0 0 12px 0;">Hi ${esc(b.customerName)},</p><p style="margin:0 0 12px 0;">Your booking with ${esc(brand.brandName)} for <strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)}</strong> has been cancelled.</p><p style="margin:0;">We'd love to see you another time — you can rebook any time at <a href="${brand.siteUrl}" style="color:${brand.accentColor};">${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}</a>.</p>`}
    </td></tr>`;
  return {
    subject: forOwner
      ? `Cancelled - ${b.customerName} - ${dateLong}`
      : `Your booking has been cancelled | ${brand.brandName}`,
    html: shell(brand, header, body, `Booking cancelled: ${dateLong}`),
  };
}

export function rescheduleEmail(brand: TenantBrand, b: BookingEmailData, oldDateStr: string, oldStartTime: string, forOwner: boolean): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const oldLong = formatDateLong(oldDateStr);
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.headerInk};">Booking rescheduled</div>`;
  const body = `
    <tr><td style="padding:28px 32px 16px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      ${forOwner
        ? `<p style="margin:0 0 12px 0;"><strong>${esc(b.customerName)}</strong> moved their booking.</p>`
        : `<p style="margin:0 0 12px 0;">Hi ${esc(b.customerName)},</p><p style="margin:0 0 12px 0;">Your booking with ${esc(brand.brandName)} has been moved.</p>`}
      <p style="margin:0 0 6px 0; color:#687281;">From: ${esc(oldLong)} at ${formatTime12hr(oldStartTime)}</p>
      <p style="margin:0;">To: <strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}</strong></p>
    </td></tr>`;
  return {
    subject: forOwner
      ? `Rescheduled - ${b.customerName} - now ${dateLong}`
      : `Your booking has been rescheduled | ${brand.brandName}`,
    html: shell(brand, header, body, `Rescheduled to ${dateLong}`),
  };
}

// Team invite — sent when an owner adds someone to their business.
export function inviteEmail(
  brand: TenantBrand,
  opts: { role: string; link: string; expiresAt: string },
): { subject: string; html: string } {
  const roleWord = opts.role === "owner" ? "an owner" : "a staff member";
  const expires = formatDateLong(String(opts.expiresAt).slice(0, 10));
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.headerInk};">You've been added to the team</div>`;
  const body = `
    <tr><td style="padding:28px 32px 16px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      <p style="margin:0 0 12px 0;">${esc(brand.brandName)} has invited you to join their booking dashboard as ${esc(roleWord)}.</p>
      <p style="margin:0 0 20px 0;">Use the button below to set your password and sign in. This link works until ${esc(expires)}.</p>
      <p style="margin:0 0 20px 0;"><a href="${opts.link}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:bold; color:${brand.accentColor === "#ffffff" ? "#000000" : "#ffffff"}; background-color:${brand.accentColor}; text-decoration:none; border-radius:10px;">Set up your account</a></p>
      <p style="margin:0; font-size:12px; color:#687281;">Or open: ${esc(opts.link)}</p>
    </td></tr>`;
  return {
    subject: `Join ${brand.brandName} on the booking dashboard`,
    html: shell(brand, header, body, `${brand.brandName} invited you to their dashboard.`),
  };
}
