// ROADMAP 97.40 - the customer import's REAL rules.
//
// This file is the behaviour: the edge function (`import-customers/index.ts`)
// runs it, and `tests/customer-import-edge.test.mjs` runs it too, against a
// fake database. It has NO runtime imports (only `import type`, which is
// fully erased): Deno deploys it as part of the function, and node imports it
// directly (type stripping) in the test.
//
// The screen preview (`app/src/lib/customer-import.js`) keeps its own
// parse/preview for instant feedback; a parity test pins the two sides to the
// same verdicts on the same rows.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.58.0";

export interface ImportRow {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  vehicle?: unknown;
  notes?: unknown;
}

export interface ImportValid {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface ImportDup {
  row: number;
  name: string;
  phone: string;
  email: string;
  reason: string;
}

export interface ImportBad {
  row: number;
  name: string;
  reason: string;
}

// A US number arrives with and without its country code (+1 (562) 555-0180
// vs 5625550180): digits alone give different keys and the same customer gets
// imported twice. An 11-digit number starting in 1 is the country code, not
// part of the number, in both matching paths.
export const normPhone = (p: unknown): string => {
  const d = String(p ?? "").replace(/\D/g, "");
  return d.length === 11 && d[0] === "1" ? d.slice(1) : d;
};

export const normEmail = (e: unknown): string => String(e ?? "").trim().toLowerCase();

// Every existing customer's contact keys, in stable pages. The order is a
// UNIQUE key (`id`): offset pages without one can skip rows between requests
// on a business with more than a page of customers, and a skipped row sails
// through duplicate checking.
export async function existingKeys(db: SupabaseClient, businessId: string): Promise<Set<string>> {
  const keys = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("customers")
      .select("phone, email")
      .eq("business_id", businessId)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as { phone?: unknown; email?: unknown }[];
    for (const c of rows) {
      const p = normPhone(c.phone);
      if (p) keys.add(`p:${p}`);
      const e = normEmail(c.email);
      if (e) keys.add(`e:${e}`);
    }
    if (rows.length < 1000) return keys;
  }
}

// The duplicate rule, one place: a row matching on EITHER phone or email is a
// duplicate, against existing customers and within the file. Row numbers are
// 1-based with the header as row 1, the same numbering the screen preview
// uses, so the two name the same rows.
export function classify(rows: ImportRow[], seen: Set<string>): {
  valid: ImportValid[];
  duplicates: ImportDup[];
  bad: ImportBad[];
} {
  const valid: ImportValid[] = [];
  const duplicates: ImportDup[] = [];
  const bad: ImportBad[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();
  rows.forEach((r, i) => {
    const rowNo = i + 2; // 1 is the header
    const name = String(r.name ?? "").trim();
    const phone = String(r.phone ?? "").trim();
    const email = String(r.email ?? "").trim();
    if (!name || !phone) {
      bad.push({ row: rowNo, name, reason: !name ? "Missing name" : "Missing phone" });
      return;
    }
    const p = normPhone(phone);
    const e = normEmail(email);
    const fileKey = p ? `p:${p}` : e ? `e:${e}` : `n:${name.toLowerCase()}`;
    if ((p && seenPhones.has(p)) || (e && seenEmails.has(e)) || seenNames.has(fileKey)) {
      duplicates.push({ row: rowNo, name, phone, email, reason: "Duplicate in this file" });
      return;
    }
    if (p) seenPhones.add(p);
    if (e) seenEmails.add(e);
    seenNames.add(fileKey);
    if ((p && seen.has(`p:${p}`)) || (e && seen.has(`e:${e}`))) {
      duplicates.push({ row: rowNo, name, phone, email, reason: "Already a customer" });
      return;
    }
    valid.push({
      name,
      phone,
      email: email || null,
      address: String(r.address ?? "").trim() || null,
      notes: [String(r.vehicle ?? "").trim() ? `Vehicle: ${String(r.vehicle).trim()}` : "",
        String(r.notes ?? "").trim()].filter(Boolean).join("\n") || null,
    });
  });
  return { valid, duplicates, bad };
}

// Rows as saved: flagged imported under one batch id, vehicle text preserved
// in the existing notes representation. Test fixtures keep their own
// `is_test` flag and are never touched by an undo: flag, don't delete.
export const toImportRows = (valid: ImportValid[], businessId: string, batchId: string) =>
  valid.map((v) => ({
    business_id: businessId,
    name: v.name,
    phone: v.phone,
    email: v.email,
    address: v.address,
    notes: v.notes,
    imported: true,
    import_batch_id: batchId,
  }));

export interface CommitResult {
  batch_id: string | null;
  created: number;
  duplicates: ImportDup[];
  bad: ImportBad[];
}

// ONE SAVE AT A TIME PER BUSINESS. The duplicate check and the insert are two
// requests, so two overlapping saves could both check before either inserts
// and both create the same customer. A save first claims the business's row in
// `customer_import_locks` (its primary key refuses a second claim), waits while
// another save holds it, and releases only its own claim. A claim left by a
// crashed save is cleared once it is older than LOCK_STALE_MS.
export const LOCK_STALE_MS = 60_000;
const LOCK_WAIT_MS = 250, LOCK_TRIES = 40; // up to 10 seconds behind another save

async function withImportLock<T>(db: SupabaseClient, businessId: string, fn: () => Promise<T>): Promise<T> {
  const holder = crypto.randomUUID();
  for (let tries = 0; ; tries++) {
    const { error } = await db.from("customer_import_locks").insert({ business_id: businessId, holder });
    if (!error) break;
    if (error.code !== "23505") throw error;
    if (tries >= LOCK_TRIES) throw new Error("another import is still saving");
    await db.from("customer_import_locks").delete().eq("business_id", businessId)
      .lt("locked_at", new Date(Date.now() - LOCK_STALE_MS).toISOString());
    await new Promise((r) => setTimeout(r, LOCK_WAIT_MS));
  }
  try {
    return await fn();
  } finally {
    await db.from("customer_import_locks").delete().eq("business_id", businessId).eq("holder", holder);
  }
}

// The real commit path the handler runs: re-validate server-side, insert the
// valid ones flagged imported under one batch id - inside the business's lock.
export async function commitImportBatch(
  db: SupabaseClient,
  businessId: string,
  rows: ImportRow[],
): Promise<CommitResult> {
  return withImportLock(db, businessId, async () => {
    const seen = await existingKeys(db, businessId);
    const { valid, duplicates, bad } = classify(rows, seen);
    if (valid.length === 0) return { batch_id: null, created: 0, duplicates, bad };
    const batchId = crypto.randomUUID();
    const { error } = await db.from("customers").insert(toImportRows(valid, businessId, batchId));
    if (error) throw error;
    return { batch_id: batchId, created: valid.length, duplicates, bad };
  });
}

// The real undo path the handler runs: exactly this batch in ONE atomic
// delete - this business, this batch id, flagged imported, never a test
// fixture. Anything else (other batches, hand-added customers, unimported
// rows, test fixtures) stays byte-for-byte, and a booking pointing at an
// imported customer refuses the WHOLE undo instead of half-deleting it. The
// count reported is the rows actually removed.
export async function undoImportBatch(
  db: SupabaseClient,
  businessId: string,
  batchId: string,
): Promise<{ removed: number }> {
  const { data, error } = await db
    .from("customers")
    .delete()
    .eq("business_id", businessId)
    .eq("import_batch_id", batchId)
    .eq("imported", true)
    .eq("is_test", false)
    .select("id");
  if (error) throw error;
  return { removed: ((data ?? []) as unknown[]).length };
}

// THE HANDLER ITSELF, so the node suite runs the real request path - the
// membership refusal included - and not a copy of it. `import-customers/index.ts`
// only wires the real database, `requireMember` and the http helpers in.
export interface ImportDeps {
  db: SupabaseClient;
  requireMember: (req: Request, businessId: string) => Promise<unknown | null>;
  json: (body: unknown, status?: number) => Response;
  preflight: () => Response;
}

export async function handleImportRequest(req: Request, deps: ImportDeps): Promise<Response> {
  const { db, json } = deps;
  if (req.method === "OPTIONS") return deps.preflight();
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "preview").trim();
    const businessId = String(body.business_id ?? "").trim();
    if (!businessId) return json({ error: "business_id is required" }, 400);
    const member = await deps.requireMember(req, businessId);
    if (!member) return json({ error: "not_found" }, 404);

    if (action === "undo") {
      const batchId = String(body.batch_id ?? "").trim();
      if (!batchId) return json({ error: "batch_id is required" }, 400);
      try {
        const { removed } = await undoImportBatch(db, businessId, batchId);
        return json({ ok: true, removed });
      } catch (undoErr) {
        console.error("import-customers undo failed:", undoErr);
        return json({ error: "We could not undo that import. Please try again." }, 500);
      }
    }

    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : [];
    if (action === "preview") {
      // Every existing customer, read in pages - never only the screen's
      // first 200 - so a match outside that list is named here, not later.
      const seen = await existingKeys(db, businessId);
      const { valid, duplicates, bad } = classify(rows, seen);
      return json({ valid, duplicates, bad, total: rows.length });
    }

    if (action === "commit") {
      try {
        return json(await commitImportBatch(db, businessId, rows));
      } catch (commitErr) {
        console.error("import-customers commit failed:", commitErr);
        return json({ error: "We could not save that import. Please try again." }, 500);
      }
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("import-customers:", (err as Error).message);
    return json({ error: "We could not complete that. Please try again." }, 500);
  }
}
