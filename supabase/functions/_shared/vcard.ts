// ROADMAP 4.2 — the customer's contact card, attached to the detailer's own
// booking alert.
//
// The old site did this (`reference/.../create-booking/index.ts:947-977`) and
// the conversion dropped it. It is the single most-used thing on 4.2's list
// for a trade run off a phone: the alert arrives, one tap adds the customer to
// contacts, and the detailer can ring them from the same screen. Without it
// they retype a phone number off an email.
//
// **THIS IS THE SECOND COPY OF `app/src/lib/platform.js`'s `buildVCard`, AND
// IT IS THE SAME WALL AS `_shared/brandColor.js`**: an edge function is its own
// Deno bundle and cannot import out of `supabase/`, while the DASHBOARD's Save
// contact button cannot import into it. Neither copy can be deleted.
// `tests/vcard.test.mjs` is the price of that permission — it runs the two
// against the same inputs and fails if a character of output differs. Change
// one and the test tells you about the other.
//
// vCard 3.0, which is what both iOS and Android read. Line folding is not
// needed at these lengths; escaping commas and semicolons is, because an
// address is full of both and an unescaped one silently truncates the field.
// CRLF is not a style choice — RFC 6350 requires it and iOS is strict.

const esc = (v: string | null | undefined): string =>
  String(v || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export interface VCardInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  org?: string | null;
}

export function buildVCard({ name, phone, email, address, org }: VCardInput): string {
  const parts = String(name || "").trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : "";
  const first = parts.join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(name)}`,
    org ? `ORG:${esc(org)}` : null,
    phone ? `TEL;TYPE=CELL:${esc(phone)}` : null,
    email ? `EMAIL;TYPE=INTERNET:${esc(email)}` : null,
    address ? `ADR;TYPE=HOME:;;${esc(address)};;;;` : null,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

// A filename a phone will accept. Everything but word characters, spaces and
// hyphens goes, because a `/` in a customer's name is a path on some clients
// and an apostrophe is a quoting problem on others.
export const vcardFilename = (name?: string | null): string =>
  `${String(name || "contact").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "contact"}.vcf`;

// Resend takes attachment content as base64. `btoa` is byte-oriented, so a
// name with an accent in it has to be UTF-8 encoded first — otherwise the
// call throws on the one customer whose name is not ASCII, and because the
// send is best-effort by design that would be an owner alert that silently
// never arrives.
export function vcardAttachment(input: VCardInput): { filename: string; content: string } {
  const bytes = new TextEncoder().encode(buildVCard(input));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return { filename: vcardFilename(input.name), content: btoa(binary) };
}
