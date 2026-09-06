// THE CUSTOMER'S CONTACT CARD, AND THE PRICE OF ITS SECOND COPY.
//
// Roadmap 4.2. `supabase/functions/_shared/vcard.ts` and
// `app/src/lib/platform.js` build the same vCard for two different reasons —
// the edge function attaches it to the detailer's booking alert, the dashboard
// hands it to the phone from a Save contact button — and neither can import
// the other: an edge function is its own Deno bundle and cannot reach out of
// `supabase/`, which is the same wall that forced `_shared/brandColor.js`.
//
// **THIS FILE IS THE PERMISSION FOR THAT SECOND COPY.** It runs both against
// the same inputs and fails if a single character differs. Change one and the
// test tells you about the other — which is the only thing that stops the
// email's card and the button's card drifting into two subtly different
// formats that two different phones then disagree about.
//
// AND IT PINS THE FORMAT ITSELF, because a vCard that a phone silently refuses
// is invisible from every screen in this product: the email sends, the
// attachment arrives, and the tap does nothing.
//
// Credential-free, no dev server, no browser. Node 24 strips the types, so it
// imports the .ts directly and reads the SAME file the edge function runs.
//
//   node tests/vcard.test.mjs

import { buildVCard as edgeCard, vcardAttachment, vcardFilename } from "../supabase/functions/_shared/vcard.ts";
import { buildVCard as appCard } from "../app/src/lib/platform.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// Every shape a real customer record takes, including the ones that break
// naive string building.
const CASES = [
  { label: "an ordinary customer", input: { name: "Marcus Webb", phone: "562-555-0142", email: "m@example.com", address: "1450 Marina Blvd, Long Beach, CA", org: "Coastline Auto Detailing customer" } },
  { label: "one name only", input: { name: "Cher", phone: "555-0100" } },
  { label: "three names", input: { name: "Ana Maria del Toro", phone: "555-0101", email: "a@example.com" } },
  { label: "no phone, only email", input: { name: "Jo Chen", email: "jo@example.com" } },
  { label: "an address full of commas", input: { name: "Pat Lee", address: "Unit 3, 12 High St, Apt; 4" } },
  { label: "a name with an accent", input: { name: "Renée Sørensen", phone: "555-0102" } },
  { label: "nothing at all", input: {} },
  { label: "a newline pasted into the address", input: { name: "Sam Ray", address: "12 High St\nLakewood" } },
];

// ─── 1. The two copies agree, character for character ─────────────────────
console.log("\n1. the edge function and the dashboard build the same card");
{
  for (const c of CASES) {
    const a = edgeCard(c.input);
    const b = appCard(c.input);
    check(`${c.label}`, a === b, `edge:\n${JSON.stringify(a)}\napp:\n${JSON.stringify(b)}`);
  }
  // THE CHECK THAT THE CHECKS ABOVE HAVE SUBJECTS. Two functions that both
  // returned "" would agree on all eight and prove nothing.
  check("the cards are not all empty",
    CASES.every((c) => edgeCard(c.input).includes("BEGIN:VCARD")),
    "a builder that returns nothing agrees with anything");
}

// ─── 2. The format a phone will actually accept ───────────────────────────
console.log("\n2. it is a vCard a phone reads");
{
  const card = edgeCard(CASES[0].input);
  check("it begins and ends correctly",
    card.startsWith("BEGIN:VCARD\r\nVERSION:3.0") && card.endsWith("END:VCARD"), JSON.stringify(card));
  check("LINES END CRLF, which RFC 6350 requires and iOS enforces",
    card.includes("\r\n") && !/[^\r]\n/.test(card),
    "a bare LF is the difference between a contact card and a file nothing opens");
  check("the surname and given name are split", card.includes("N:Webb;Marcus;;;"));
  check("the full name is kept whole", card.includes("FN:Marcus Webb"));
  check("the phone is a mobile", card.includes("TEL;TYPE=CELL:562-555-0142"));
  check("the email is there", card.includes("EMAIL;TYPE=INTERNET:m@example.com"));
  check("the org says whose customer this is", card.includes("ORG:Coastline Auto Detailing customer"),
    "a phone book full of customers still has to say where they came from");

  // The escaping is the part that fails silently: an unescaped comma inside
  // ADR ends the field, and the rest of the address is dropped by the phone
  // with no error anywhere.
  const commas = edgeCard(CASES[4].input);
  check("COMMAS IN AN ADDRESS ARE ESCAPED", commas.includes("Unit 3\\, 12 High St\\, Apt\\; 4"),
    commas);
  check("a semicolon is escaped too", commas.includes("Apt\\; 4"));
  const nl = edgeCard(CASES[7].input);
  check("a pasted newline becomes a literal \\n, not a broken line",
    nl.includes("12 High St\\nLakewood") && !/[^\\]\n(?!.*(?:END|BEGIN|N:|FN:|TEL|EMAIL|ADR|ORG|VERSION))/.test(nl),
    nl);

  const one = edgeCard(CASES[1].input);
  check("a single-word name leaves the surname empty rather than guessing",
    one.includes("N:;Cher;;;"), one);
  const none = edgeCard(CASES[6].input);
  check("an empty record is still a valid card, not a crash",
    none.startsWith("BEGIN:VCARD") && none.endsWith("END:VCARD"), none);
  check("...and it carries no empty TEL or EMAIL lines",
    !none.includes("TEL") && !none.includes("EMAIL") && !none.includes("ADR"),
    "a blank field on a contact card is worse than a missing one");
}

// ─── 3. The attachment Resend is handed ───────────────────────────────────
console.log("\n3. the attachment");
{
  const att = vcardAttachment(CASES[0].input);
  check("it has a filename and base64 content", !!att.filename && !!att.content);
  check("the filename is a .vcf", att.filename.endsWith(".vcf"), att.filename);
  check("the filename is the customer's name", att.filename === "Marcus-Webb.vcf", att.filename);
  check("the content decodes back to the card",
    Buffer.from(att.content, "base64").toString("utf8") === edgeCard(CASES[0].input));

  // btoa is byte-oriented. Without encoding to UTF-8 first this THROWS on the
  // one customer whose name is not ASCII — and because the send is
  // best-effort by design, that would be an owner alert that silently never
  // arrives for that customer and only that customer.
  const accented = vcardAttachment(CASES[5].input);
  check("A NAME WITH AN ACCENT DOES NOT THROW AND SURVIVES THE ROUND TRIP",
    Buffer.from(accented.content, "base64").toString("utf8").includes("Renée Sørensen"),
    Buffer.from(accented.content, "base64").toString("utf8"));

  check("a slash in a name cannot become a path",
    vcardFilename("Ann/Bob O'Neill").indexOf("/") === -1, vcardFilename("Ann/Bob O'Neill"));
  check("an empty name still yields a filename", vcardFilename("") === "contact.vcf");
  check("a name of only punctuation still yields one", vcardFilename("///") === "contact.vcf",
    vcardFilename("///"));
}

// ─── 4. Where it is attached, and where it is NOT ─────────────────────────
console.log("\n4. it rides the detailer's alert and nothing else");
{
  const { readFileSync } = await import("node:fs");
  const cb = readFileSync("supabase/functions/create-booking/index.ts", "utf8");
  const body = cb.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("create-booking attaches one", /attachments: card/.test(body));
  // The CUSTOMER's send, isolated by the one thing that identifies it — it is
  // addressed `to: booking.customer_email`. Reading "is `attachments` anywhere
  // near `customer_email`" was the first version and it failed on the vCard
  // block's OWN reference to that column: a check that cannot tell the subject
  // from the ingredient.
  const custSend = body.match(/sendTenantEmail\(\{[^}]*to: booking\.customer_email[\s\S]*?\}\);/)?.[0] ?? "";
  check("the customer's send was found", custSend.length > 0, "otherwise the next check has no subject");
  check("ONLY ON THE DETAILER'S COPY", !custSend.includes("attachments"),
    `a customer does not need a contact card for themselves:\n${custSend}`);
  check("and only when there is something to save",
    /booking\.customer_phone \|\| booking\.customer_email/.test(body),
    "a card with a name and no way to reach them wastes the tap");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
