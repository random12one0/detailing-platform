// The offline engine (belt-staging/demo-backend.mjs) with the fictional
// Brightline seed, its business renamed to the reserved example slug
// `example_brightline` — a slug no real business can hold (the database allows
// only [a-z0-9-]), so the example site at /site/example/brightline can never
// draw a real detailer's data. The seed file itself is not edited; the copy in
// memory also keeps only the one real photo pair (exampleSeed below).
//
//   node scripts/studio/example-engine.mjs [--port 54390]
//
// Prints {"ok":true,"url":...} once listening. Nothing is written to disk.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const BELT = process.env.STUDIO_BELT || path.join(ROOT, "tools/studio-audit");
export const EXAMPLE_SLUG = "example_brightline";

export function exampleSeed() {
  const seed = JSON.parse(readFileSync(path.join(BELT, "fixtures/sites/brightline.seed.json"), "utf8"));
  const b = seed.tables.businesses.find((x) => x.slug === "brightline");
  if (!b) throw new Error("the Brightline seed no longer has a business with slug brightline");
  b.slug = EXAMPLE_SLUG;
  // Pictures: the example has NO photographs of real work. Its one before/after
  // pair is two drawn illustrations of a paint surface (not of a car), each
  // marked "Example image", and its caption says so
  // (app/public/examples/brightline/credits.json). The seed's other three photos
  // are switched off, not faked. (2026-11-05: the earlier photo was not Andrew's.)
  for (const g of seed.tables.gallery_images) {
    if (g.id.endsWith("801")) Object.assign(g, { before_url: "/examples/brightline/example-before.svg", after_url: "/examples/brightline/example-after.svg",
      caption: "Example image: an illustration, not real work." });
    else g.is_active = false;
  }
  // STUDIO S8 rehearsal only: STUDIO_EXAMPLE_PAYING=1 makes the example business a paying website customer, so the
  // publish path can be walked end to end on the test domain (brightline.example.test). Without it the example is a
  // prospect, and the Studio refuses to publish it, as it must. Never a setting: only a test or a rehearsal sets it.
  seed.tables.platform_subscriptions = process.env.STUDIO_EXAMPLE_PAYING === "1"
    ? [{ business_id: b.id, plan: "website", term: "monthly", status: "active", recurring_cents: 9900, bill_interval: "month" }] : [];
  return seed;
}

export async function startExampleEngine({ port = 0, quiet = true } = {}) {
  const { startDemoBackend } = await import(pathToFileURL(path.join(BELT, "demo-backend.mjs")).href);
  return startDemoBackend({ port, seed: exampleSeed(), platform: ROOT, quiet });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--port");
  startExampleEngine({ port: i > 0 ? Number(process.argv[i + 1]) : 54390, quiet: false })
    .then(({ url }) => console.log(JSON.stringify({ ok: true, url })))
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e.message || e) })); process.exit(1); });
}
