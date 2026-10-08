// ROADMAP 4.4 STAGE 2 — what "a new business" means, in one place.
//
// It was in `create-business/index.ts` and nowhere else, because signup was
// the only way a business could come into existence. The back office adds a
// second way — the owner signs somebody up at their shop rather than sending
// them to a form — and **the second copy of this is where two kinds of
// business start to differ.**
//
// The differences would be quiet ones: a business created by hand with no
// `business_settings` row renders a dashboard of nulls; one with no
// `business_hours` has a booking page that can never be booked, which is a
// confusing first impression to hand somebody at their own counter. Neither
// throws.
//
// WHAT IS DELIBERATELY NOT IN HERE: the OWNER. Signup makes the caller the
// owner because they are standing there with a session; the back office
// cannot, because the person it is signing up may not have an account at all.
// So membership is the caller's business and this function refuses to guess.

import { checkName } from "./nameLimit.js";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface NewBusinessInput {
  name: string;
  slug: string;
  timezone: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  dropoff_address?: string | null;
  service_area?: string | null;
}

export interface NewBusinessResult {
  business?: { id: string; slug: string; timezone: string; name: string };
  error?: string;
  status?: number;
}

// A WORKING WEEK FROM THE FIRST SECOND. Weekdays 09:00–17:00, weekends
// closed — not because that is right for every detailer, but because a
// booking page with no open days is indistinguishable from a broken one.
const hoursFor = (business_id: string) => [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ business_id, weekday, open_time: "09:00", close_time: "17:00" })),
  ...[0, 6].map((weekday) => ({ business_id, weekday, open_time: null, close_time: null })),
];

export async function createBusinessRow(db: Db, input: NewBusinessInput): Promise<NewBusinessResult> {
  // ROADMAP 2.15a — THE NAME IS TRIMMED, CHECKED FOR EMPTY *AND* CHECKED FOR
  // LENGTH IN ONE PLACE. `_shared/nameLimit.js` is a plain `.js` module so a
  // node test can execute the rule; its header carries the reasoning,
  // including why it counts code points rather than `.length`.
  //
  // **THIS IS THE ONLY NAME AN EDGE FUNCTION WRITES.** Both ways a business
  // can come into existence land here — `create-business` (signup) and
  // `platform-admin`'s `create` (the back office) — and there is exactly ONE
  // `insert` into `businesses` in all of `supabase/functions`: the one below.
  // The other four names in 2.15a (`services`, `add_ons`, `service_groups`,
  // `plans`) are written by the BROWSER under RLS with no server in the path,
  // so for those the column's own CHECK is the only server-side guard there
  // can be. 2.15a says so rather than letting this read as covering five.
  const checked = checkName(input.name);
  if (!checked.ok) return { error: checked.error, status: 400 };
  const name = checked.value;
  const slug = String(input.slug || "").trim().toLowerCase();
  const timezone = String(input.timezone || "").trim();

  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    return { error: "Choose a web address using lowercase letters, numbers and dashes.", status: 400 };
  }
  // TIMEZONE IS REQUIRED HERE TOO. The column keeps a default only as a
  // backstop for direct inserts; a business quietly running on the wrong
  // clock books every job at the wrong time, and nothing about that is
  // visible until a customer turns up three hours early.
  if (!timezone) return { error: "Choose a timezone. Every booking time depends on it.", status: 400 };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { error: `"${timezone}" is not a recognized timezone.`, status: 400 };
  }

  const { data: existing } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { error: "That web address is already taken.", status: 409 };

  const { data: business, error } = await db
    .from("businesses")
    .insert({
      name,
      slug,
      timezone,
      contact_email: input.contact_email?.trim() || null,
      contact_phone: input.contact_phone?.trim() || null,
      dropoff_address: input.dropoff_address?.trim() || null,
      service_area: input.service_area?.trim() || null,
    })
    .select()
    .single();
  if (error) return { error: error.message, status: 500 };

  await Promise.all([
    db.from("business_settings").insert({ business_id: business.id }),
    db.from("business_branding").insert({ business_id: business.id }),
    db.from("business_hours").insert(hoursFor(business.id)),
  ]);

  return { business };
}
