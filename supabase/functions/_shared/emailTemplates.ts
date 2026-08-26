// Tenant-branded email templates. Every business-specific value (name,
// phone, addresses, review links, colors, site URL) is a template variable —
// nothing about any particular detailer is hardcoded here.
//
// This module is dependency-free (no Deno/DB imports) so the routing and
// rendering logic can be tested under plain Node.

export interface TenantBrand {
  businessId: string;
  slug: string;
  brandName: string;
  contactEmail: string | null;  // becomes Reply-To; also where owner mail goes
  contactPhone: string | null;
  dropoffAddress: string | null;
  siteUrl: string;
  primaryColor: string;         // header background
  accentColor: string;          // links/highlights
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

const sizeDisplay = (size: string) =>
  !size ? "Unknown" : size.charAt(0).toUpperCase() + size.toLowerCase().slice(1);

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
          <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#ffffff;">${esc(brand.brandName)}</div>
          <div style="height:3px; width:44px; background-color:${brand.accentColor}; margin:12px 0 14px 0; border-radius:2px;"></div>
          ${headerHtml}
        </td></tr>
        ${bodyHtml}
        <tr><td style="padding:24px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
          <div style="border-top:1px solid #eef2f6; padding-top:20px;">
            <p style="margin:0 0 4px 0; font-size:14px; font-weight:bold; color:${brand.primaryColor};">${esc(brand.brandName)}</p>
            ${brand.contactPhone ? `<p style="margin:0 0 4px 0; font-size:13px; color:#64748b;">${esc(brand.contactPhone)}</p>` : ""}
            <p style="margin:0 0 10px 0; font-size:13px; color:#64748b;"><a href="${brand.siteUrl}" style="color:${brand.accentColor}; text-decoration:none;">${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
            <p style="margin:0; font-size:11px; color:#a8b4c0;">Automated message — reply to reach us.</p>
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
  `<tr><td style="padding:5px 0; color:#64748b; width:120px; vertical-align:top; font-size:14px;">${esc(k)}</td><td style="padding:5px 0; vertical-align:top; font-size:14px; color:#0f172a; ${bold ? "font-weight:bold;" : ""}">${v}</td></tr>`;

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

export function customerConfirmationEmail(brand: TenantBrand, b: BookingEmailData): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const services = [...b.serviceNames.map((s) => esc(s)), ...b.addOnNames.map((a) => `Add-on: ${esc(a)}`)];
  const body = `
    <tr><td style="padding:28px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0; font-size:16px; color:#0f172a; font-weight:bold;">Hi ${esc(b.customerName)},</p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">Thanks for booking with us. Here are the details of your appointment.</p>
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
      <p style="margin:12px 0 0 0; font-size:12px; line-height:1.5; color:#94a3b8;">Your appointment time is approximate &mdash; we aim to arrive within about 30 minutes of it. This is a booking request; your time is our best availability until we confirm it with you.</p>
    `)}</td></tr>
    <tr><td style="padding:20px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Services")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
        ${services.map((s) => `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">${s}</td></tr>`).join("")}
      </table>
    </td></tr>
    <tr><td style="padding:20px 32px 4px 32px;">${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
        <tr><td style="padding:4px 0; color:#64748b;">Subtotal</td><td style="padding:4px 0; text-align:right;">${money(b.subtotal)}</td></tr>
        ${b.siteDiscount > 0 ? `<tr><td style="padding:4px 0; color:#64748b;">${b.siteDiscountPercent}% Sale</td><td style="padding:4px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">-${money(b.siteDiscount)}</td></tr>` : ""}
        ${b.promoCode ? `<tr><td style="padding:4px 0; color:#64748b;">Promo (${esc(b.promoCode)})</td><td style="padding:4px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">${b.promoDiscount > 0 ? `-${money(b.promoDiscount)}` : "Applied"}</td></tr>` : ""}
        <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid #dbe4ec;"></div></td></tr>
        <tr><td style="padding:8px 0 0 0; font-size:16px; font-weight:bold; color:${brand.primaryColor};">Estimated total</td><td style="padding:8px 0 0 0; text-align:right; font-size:20px; font-weight:bold; color:${brand.primaryColor};">${money(b.total)}</td></tr>
      </table>
      <p style="margin:12px 0 0 0; font-size:12px; line-height:1.5; color:#94a3b8;">This total is an estimate and may change if the vehicle&rsquo;s condition requires additional time or services.</p>
    `)}</td></tr>
    <tr><td style="padding:24px 32px 8px 32px;" align="center">
      <a href="${b.receiptUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; background-color:${brand.accentColor}; text-decoration:none; border-radius:10px;">View / save your confirmation</a>
    </td></tr>
    ${b.customerNotes ? `<tr><td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">${label(brand.accentColor, "Your notes")}<p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">${esc(b.customerNotes)}</p></td></tr>` : ""}
    ${brand.paymentMethodsLine ? `<tr><td style="padding:20px 32px 8px 32px;"><div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;"><strong style="color:${brand.primaryColor};">Payments accepted:</strong> ${esc(brand.paymentMethodsLine)}</div></td></tr>` : ""}
  `;
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#e2e8f0;">Booking confirmed</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:bold; color:#ffffff; margin-top:4px;">You're all set!</div>`;
  return {
    subject: `Booking confirmed - ${formatDateLong(b.dateStr)} | ${brand.brandName}`,
    html: shell(brand, header, body, `Your booking with ${brand.brandName} is confirmed for ${dateLong}.`),
  };
}

export function ownerNewBookingEmail(brand: TenantBrand, b: BookingEmailData): { subject: string; html: string } {
  const dateLong = formatDateLong(b.dateStr);
  const services = [...b.serviceNames.map((s) => esc(s)), ...b.addOnNames.map((a) => `Add-on: ${esc(a)}`)];
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:${brand.accentColor}; font-weight:bold;">New booking received</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#ffffff; margin-top:6px;">${esc(b.customerName)}</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#e2e8f0; margin-top:4px;">${esc(dateLong)} &middot; ${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}</div>`;
  const body = `
    <tr><td style="padding:20px 28px 4px 28px;">${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#64748b;">Booking total</td>
        <td style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:${brand.primaryColor}; text-align:right;">${money(b.total)}</td>
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
      <p style="margin:0; font-size:14px; line-height:1.6; color:${b.customerNotes ? "#0f172a" : "#94a3b8"};">${esc(b.customerNotes || "None")}</p>
    </td></tr>`;
  return {
    subject: `New booking - ${b.customerName} - ${dateLong} (${money(b.total)})`,
    html: shell(brand, header, body, `${b.customerName} · ${dateLong} · ${money(b.total)}`),
  };
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
        <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; color:#0f172a;">${esc(r.label)}${r.qty > 1 ? ` <span style="color:#94a3b8;">&times;${r.qty}</span>` : ""}</td>
        <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; text-align:right; color:${isNeg ? brand.accentColor : "#0f172a"}; font-weight:${isNeg ? "bold" : "normal"}; white-space:nowrap;">${isNeg ? "-" : ""}${money(Math.abs(r.lineTotal))}</td>
      </tr>`;
    })
    .join("");
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:${brand.accentColor}; font-weight:bold;">Invoice / Receipt</div>
    <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#e2e8f0; margin-top:6px;">Ref #${invoiceRef}</div>
    ${paidLabel ? `<div style="display:inline-block; margin-top:10px; padding:4px 12px; background-color:${brand.accentColor}; border-radius:20px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; color:#ffffff; letter-spacing:1px;">${paidLabel}</div>` : ""}`;
  const body = `
    <tr><td style="padding:26px 32px 6px 32px; font-family:Arial,Helvetica,sans-serif;">
      ${label(brand.accentColor, "Billed to")}
      <div style="font-size:15px; font-weight:bold; color:#0f172a;">${esc(b.customerName)}</div>
      ${b.customerEmail ? `<div style="font-size:13px; color:#64748b; margin-top:3px;">${esc(b.customerEmail)}</div>` : ""}
      <div style="font-size:13px; color:#64748b; margin-top:6px;">${esc(formatDateLong(b.dateStr))} &middot; ${formatTime12hr(b.startTime)} &middot; ${b.serviceType === "mobile" ? "Mobile" : "Drop-off"}</div>
    </td></tr>
    <tr><td style="padding:22px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; font-weight:bold; border-bottom:2px solid #dbe4ec;">Description</td>
          <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; font-weight:bold; text-align:right; border-bottom:2px solid #dbe4ec;">Amount</td>
        </tr>
        ${rowHtml}
      </table>
    </td></tr>
    <tr><td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td></td><td style="width:260px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
          <tr><td style="padding:5px 0; color:#64748b;">Subtotal</td><td style="padding:5px 0; text-align:right;">${money(totals.chargesSubtotal)}</td></tr>
          ${totals.discountsTotal < 0 ? `<tr><td style="padding:5px 0; color:#64748b;">Discounts</td><td style="padding:5px 0; text-align:right; color:${brand.accentColor}; font-weight:bold;">-${money(Math.abs(totals.discountsTotal))}</td></tr>` : ""}
          ${totals.tipTotal > 0 ? `<tr><td style="padding:5px 0; color:#64748b;">Tip</td><td style="padding:5px 0; text-align:right;">${money(totals.tipTotal)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid ${brand.primaryColor};"></div></td></tr>
          <tr><td style="padding:10px 0 0 0; font-size:16px; font-weight:bold; color:${brand.primaryColor};">Total paid</td><td style="padding:10px 0 0 0; text-align:right; font-size:22px; font-weight:bold; color:${brand.primaryColor};">${money(totals.totalPaid)}</td></tr>
        </table>
      </td></tr></table>
    </td></tr>
    ${brand.paymentMethodsLine ? `<tr><td style="padding:20px 32px 4px 32px;"><div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;"><strong style="color:${brand.primaryColor};">Payments accepted:</strong> ${esc(brand.paymentMethodsLine)}</div></td></tr>` : ""}
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
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#ffffff;">Thank you!</div>`;
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
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#ffffff;">See you soon!</div>`;
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
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#ffffff;">Booking cancelled</div>`;
  const body = `
    <tr><td style="padding:28px 32px 16px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      ${forOwner
        ? `<p style="margin:0 0 12px 0;"><strong>${esc(b.customerName)}</strong> cancelled their booking for <strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)}</strong>.</p><p style="margin:0; color:#64748b;">The slot is open again.</p>`
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
  const header = `<div style="font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#ffffff;">Booking rescheduled</div>`;
  const body = `
    <tr><td style="padding:28px 32px 16px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7; color:#0f172a;">
      ${forOwner
        ? `<p style="margin:0 0 12px 0;"><strong>${esc(b.customerName)}</strong> moved their booking.</p>`
        : `<p style="margin:0 0 12px 0;">Hi ${esc(b.customerName)},</p><p style="margin:0 0 12px 0;">Your booking with ${esc(brand.brandName)} has been moved.</p>`}
      <p style="margin:0 0 6px 0; color:#94a3b8;">From: ${esc(oldLong)} at ${formatTime12hr(oldStartTime)}</p>
      <p style="margin:0;">To: <strong>${esc(dateLong)}</strong> at <strong>${formatTime12hr(b.startTime)} &ndash; ${formatTime12hr(b.endTime)}</strong></p>
    </td></tr>`;
  return {
    subject: forOwner
      ? `Rescheduled - ${b.customerName} - now ${dateLong}`
      : `Your booking has been rescheduled | ${brand.brandName}`,
    html: shell(brand, header, body, `Rescheduled to ${dateLong}`),
  };
}
