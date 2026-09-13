// BUILD THE VEHICLE INDEX — the list of real cars step 3 of booking types against.
//
//   node scripts/build-vehicle-index.mjs
//
// Writes app/src/book/vehicles.json. RUN IT ONCE A YEAR, when a new model year
// is out. It is not run at build time and never at page time: a booking page
// must never wait on somebody else's server, so the result ships statically in
// the bundle.
//
// THE SOURCE IS NHTSA vPIC — https://vpic.nhtsa.dot.gov/api/vehicles — the US
// government's own vehicle database. Free, no key, no account, no attribution
// required, and it is the registry the VIN decoders are built on rather than a
// scrape of somebody's catalogue.
//
// THE VEHICLE-TYPE FILTER IS WHAT MAKES IT USABLE, and it is the whole trick.
// `GetModelsForMakeYear/make/honda/modelyear/2019` with no type returns 362
// entries including every motorcycle, ATV and trailer Honda has ever built.
// Asking for `car`, `truck` and `mpv` separately returns 6 + 1 + 5 = 12 real
// vehicles a detailer would ever wash.
//
// **AND THE TYPE IS USED FOR NOTHING ELSE. IT MUST NEVER SET THE PRICE TIER.**
// vPIC tags a Camry as `car` in some years and `mpv` in others, and a Forester
// likewise — so a size tier derived from it would quote some customers the
// wrong price, which is the one failure a booking form is not allowed to have.
// The tier is the detailer's own list and the customer's own answer. The type
// is a bin we throw away after filtering.
//
// THE MAKES ARE A HAND-KEPT LIST, not vPIC's 195. Adding Koenigsegg costs a
// hundred requests and serves nobody; every make below is one a US detailer
// actually sees on a driveway. **The string here is the DISPLAY name** — vPIC
// answers in block capitals ("ASTON MARTIN") and title-casing that produces
// "Bmw" and "Gmc", so the spelling a customer reads is decided here and the
// lookup is case-insensitive anyway.
//
// SCION IS DELIBERATELY ABSENT. vPIC has no models under it in any year or
// type — it files every one of them under Toyota, as "Scion tC", "Scion xB",
// "Scion FR-S". So the cars are in the index and searching "scion" or "tc"
// finds them; only the make heading is missing, which is vPIC being right
// about who built them.
//
// AND THE FLEET CODES ARE LEFT IN ON PURPOSE. Ford’s medium-duty bin carries
// "A9513", "CF8000" and "AT8513" — chassis nobody books a detail
// for. Every filter that kills them also kills a real car: a rule on four
// straight digits takes the Saab 9000, the Mazda B2300 and the BMW 2002 with
// it. They cost about 600 bytes and surface only if somebody types them, so
// leaving them in is cheaper than a rule that quietly loses three real cars.

import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const MAKES = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet",
  "Chrysler", "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai",
  "Infiniti", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln",
  "Lucid", "Maserati", "Mazda", "Mercedes-Benz", "Mercury", "MINI",
  "Mitsubishi", "Nissan", "Oldsmobile", "Plymouth", "Polestar", "Pontiac",
  "Porsche", "Ram", "Rivian", "Saab", "Saturn", "Subaru", "Suzuki",
  "Tesla", "Toyota", "Volkswagen", "Volvo",
];

// Eleven model years rather than all thirty-two. A model that existed in 2006
// existed in 2005 and 2007 too, so sampling costs almost no coverage and cuts
// the run from ~4,400 requests to 1,518. Weighted recent on purpose: the cars
// on a detailer's calendar are mostly this decade, and the older years are here
// so that somebody's 1998 Camry still finds itself.
const YEARS = [1995, 2000, 2005, 2010, 2014, 2017, 2019, 2021, 2023, 2025, 2026];

// The three bins that are a car somebody pays to have washed. Everything vPIC
// knows that is not one of these — motorcycle, trailer, bus, incomplete
// chassis, low-speed vehicle — is left out by never being asked for.
const TYPES = ["car", "truck", "mpv"];

const API = "https://vpic.nhtsa.dot.gov/api/vehicles";

async function getJson(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === tries) throw new Error(`${url}\n  ${err.message}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

const index = {};
let requests = 0;
let empty = 0;

for (const make of MAKES) {
  const models = new Set();
  for (const year of YEARS) {
    for (const type of TYPES) {
      const url = `${API}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicletype/${type}?format=json`;
      const data = await getJson(url);
      requests++;
      for (const row of data?.Results ?? []) {
        const name = String(row?.Model_Name ?? "").trim();
        if (name) models.add(name);
      }
    }
  }
  // **A MAKE THAT ANSWERED NOTHING IS PRINTED, NOT SWALLOWED.** A silent zero
  // is how a renamed make ("Mercedes-Benz" becoming "Mercedes") drops out of
  // the picker a year from now with the script still exiting 0.
  if (models.size === 0) {
    empty++;
    console.warn(`  !! ${make}: no models in any year or type — check the spelling against vPIC`);
    continue;
  }
  index[make] = [...models].sort((a, b) => a.localeCompare(b, "en"));
  console.log(`  ${make.padEnd(14)} ${String(models.size).padStart(3)} models`);
}

const out = Object.fromEntries(Object.keys(index).sort((a, b) => a.localeCompare(b, "en")).map((k) => [k, index[k]]));
const json = JSON.stringify(out);
await writeFile(new URL("../app/src/book/vehicles.json", import.meta.url), `${json}\n`);

const models = Object.values(out).reduce((n, list) => n + list.length, 0);
console.log(`\n${requests} requests · ${Object.keys(out).length} makes · ${models} models`);
console.log(`${(json.length / 1024).toFixed(1)} KB raw · ${(gzipSync(json).length / 1024).toFixed(1)} KB gzipped`);
if (empty) console.log(`${empty} make(s) returned nothing — the index is SHORT, fix them before shipping it`);
