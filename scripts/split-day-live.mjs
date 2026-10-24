// 97.7 live probe: a two-car booking, car 1 on a weekday and car 2 on a Saturday, priced by the LIVE
// calculate-booking. Each car must be charged its own day's price: the two-car total equals the two
// single-car quotes, and the Saturday car carries the weekend line. --break=same-day prices both cars on
// car 1's day, which is the old bug's shape, and must go red.
const { SUPABASE_URL: U, SUPABASE_ANON_KEY: A } = process.env;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const svc = async (p) => (await fetch(`${U}/rest/v1/${p}`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json();
const quote = async (body) => {
  const r = await fetch(`${U}/functions/v1/calculate-booking`, { method: "POST",
    headers: { apikey: A, Authorization: `Bearer ${A}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json(); if (r.status !== 200) throw Error(`${r.status} ${JSON.stringify(j)}`); return j;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const next = (dow, from = 30) => { const d = new Date(); d.setDate(d.getDate() + from); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; };
const wed = next(3), sat = new Date(wed); sat.setDate(wed.getDate() + 3);

const biz = (await svc("businesses?slug=eq.demo-detail&select=id"))[0];
const s = (await svc(`services?business_id=eq.${biz.id}&is_active=eq.true&select=id,name,price&order=price.asc&limit=1`))[0];
const base = { business_slug: "demo-detail", service_type: "dropoff", service_ids: [s.id], vehicle_size: "sedan", start_time: "10:00" };
const one = (date) => quote({ ...base, booking_date: date, extra_vehicles: [] });
const qWed = await one(ymd(wed)), qSat = await one(ymd(sat));
const car2Date = BREAK === "same-day" ? ymd(wed) : ymd(sat);
// demo-detail allows one car; two are needed for the question, so the limit is 2 for the call and put back after.
const patch = (n) => fetch(`${U}/rest/v1/business_settings?business_id=eq.${biz.id}`, { method: "PATCH",
  headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" }, body: JSON.stringify({ max_vehicles_per_booking: n }) });
let two;
await patch(2);
try {
  two = await quote({ ...base, booking_date: ymd(wed), split_days: true,
    extra_vehicles: [{ size: "sedan", booking_date: car2Date, start_time: "10:00" }] });
} finally { await patch(1); }
const back = (await svc(`business_settings?business_id=eq.${biz.id}&select=max_vehicles_per_booking`))[0];
console.log(`car limit restored to ${back.max_vehicles_per_booking}`);

const total = (q) => Number(q.quote?.total ?? q.total ?? q.quote?.final_amount);
const fails = [];
const ok = (name, cond, detail = "") => { console.log(`${cond ? "  ok  " : "  FAIL"}  ${name}${cond ? "" : " — " + detail}`); if (!cond) fails.push(name); };
console.log(`service ${s.name}, car 1 ${ymd(wed)} (Wed), car 2 ${ymd(sat)} (Sat)`);
ok("the weekend day costs more than the weekday on its own (the rule is live)", total(qSat) > total(qWed), `${total(qWed)} vs ${total(qSat)}`);
ok("two cars on two days = each car's own-day price", Math.abs(total(two) - (total(qWed) + total(qSat))) < 0.005,
  `two=${total(two)} expected=${total(qWed) + total(qSat)}`);
const text = JSON.stringify(two);
ok("the Saturday car carries a weekend line", /weekend/i.test(text), text.slice(0, 300));
console.log(fails.length ? `${fails.length} failed` : "all passed");
process.exit(fails.length ? 1 : 0);
