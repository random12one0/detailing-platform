// A fake, in-memory Supabase (PostgREST + GoTrue + Storage + Functions) so the
// detailing-platform app renders offline for automated screen checks.
//
//   node demo-backend.mjs --port 54390 [--seed demo-seed.json]
//
// Prints one JSON line {"ok":true,"port":N} once listening. Node stdlib only.
// Nothing is written to disk; every write lives in memory until the process ends.
// Auth accepts ANY email/password: a known seed email signs in as that user,
// anything else signs in as the first seed user (the demo owner).
//
// ponytail: PostgREST is emulated best-effort — embeds resolve by `<table>_id`
// naming, embedded filters/order are ignored, no RLS. Add a case when a page
// needs one.

import http from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PNG_1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

// ---------------------------------------------------------------- seed + date shift
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function shiftDates(value, days) {
  if (!days) return value;
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, days));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftDates(v, days)]));
  }
  if (typeof value === "string" && DATE_RE.test(value)) {
    const ms = days * 86400_000;
    if (value.length === 10) return new Date(Date.parse(`${value}T00:00:00Z`) + ms).toISOString().slice(0, 10);
    return new Date(Date.parse(value) + ms).toISOString();
  }
  return value;
}

function loadSeed(seed) {
  const raw = typeof seed === "string" ? JSON.parse(readFileSync(seed, "utf8")) : (seed ?? { tables: {}, users: [] });
  // Keep "today" in the seed equal to today, so Today/Calendar always have content.
  const days = raw.seeded_on ? Math.round((Date.parse(localToday()) - Date.parse(raw.seeded_on)) / 86400_000) : 0;
  const tables = shiftDates(structuredClone(raw.tables ?? {}), days);
  const users = raw.users?.length ? raw.users : [{ id: "00000000-0000-4000-8000-000000000001", email: "demo@example.com" }];
  return { tables, users };
}

// ---------------------------------------------------------------- small parsers
// Split on `sep` at paren depth 0, respecting double quotes.
function splitTop(s, sep = ",") {
  const out = []; let depth = 0, q = false, cur = "";
  for (const ch of s) {
    if (ch === '"') q = !q;
    if (!q && ch === "(") depth++;
    if (!q && ch === ")") depth--;
    if (!q && depth === 0 && ch === sep) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur !== "") out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
const unquote = (s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
const listVals = (s) => splitTop(s.replace(/^[({]|[)}]$/g, "")).map(unquote);

function getPath(row, key) {
  const parts = key.split(/->>?/);
  let v = row?.[parts[0]];
  for (const p of parts.slice(1)) v = v == null ? undefined : v[p];
  return v;
}

function cmp(a, b) {
  if (a == null) return NaN;
  if (typeof a === "number" || (typeof a !== "boolean" && a !== "" && !isNaN(a) && !isNaN(b) && b !== "")) return Number(a) - Number(b);
  if (typeof a === "string" && DATE_RE.test(a) && DATE_RE.test(b)) return Date.parse(a) - Date.parse(b);
  const sa = String(a); return sa < b ? -1 : sa > b ? 1 : 0;
}
const likeRe = (pat, flags) => new RegExp(`^${pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[*%]/g, ".*").replace(/_/g, ".")}$`, flags);
const asArr = (v) => (Array.isArray(v) ? v : v == null ? [] : String(v).startsWith("[") ? JSON.parse(v) : listVals(String(v)));

function test(v, op, val) {
  switch (op) {
    case "eq": return v != null && cmp(v, val) === 0 || String(v) === val;
    case "neq": return v != null && String(v) !== val && cmp(v, val) !== 0;
    case "gt": return cmp(v, val) > 0;
    case "gte": return cmp(v, val) >= 0;
    case "lt": return cmp(v, val) < 0;
    case "lte": return cmp(v, val) <= 0;
    case "like": return v != null && likeRe(val, "").test(String(v));
    case "ilike": return v != null && likeRe(val, "i").test(String(v));
    case "in": return v != null && listVals(val).some((x) => String(v) === x || cmp(v, x) === 0);
    case "is": return val === "null" ? v == null : val === "true" ? v === true : val === "false" ? v === false : v === undefined;
    case "cs": { const want = asArr(val); const have = asArr(v).map(String); return want.every((x) => have.includes(String(x))); }
    case "cd": { const allow = asArr(val).map(String); return asArr(v).every((x) => allow.includes(String(x))); }
    case "ov": { const want = asArr(val).map(String); return asArr(v).some((x) => want.includes(String(x))); }
    default: return true; // fts/plfts/etc.: not emulated, let everything through
  }
}

// "op.value" or "not.op.value" against one column.
function cond(row, key, expr) {
  let neg = false;
  if (expr.startsWith("not.")) { neg = true; expr = expr.slice(4); }
  const dot = expr.indexOf(".");
  const op = dot < 0 ? expr : expr.slice(0, dot);
  const val = dot < 0 ? "" : expr.slice(dot + 1);
  const r = test(getPath(row, key), op, unquote(val));
  return neg ? !r : r;
}

// or=(a.eq.1,and(b.gt.2,c.is.null)) — the inside of the parens.
function logic(row, kind, inner) {
  const parts = splitTop(inner).map((p) => {
    const m = /^(not\.)?(and|or)\((.*)\)$/.exec(p);
    if (m) { const r = logic(row, m[2], m[3]); return m[1] ? !r : r; }
    const dot = p.indexOf(".");
    return cond(row, p.slice(0, dot), p.slice(dot + 1));
  });
  return kind === "or" ? parts.some(Boolean) : parts.every(Boolean);
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function filterRows(rows, params) {
  const checks = [];
  for (const [k, v] of params) {
    if (RESERVED.has(k) || k.includes(".")) continue; // embedded-resource filters ignored
    const m = /^(not\.)?(or|and)$/.exec(k);
    if (m) checks.push((r) => { const x = logic(r, m[2], v.replace(/^\(|\)$/g, "")); return m[1] ? !x : x; });
    else checks.push((r) => cond(r, k, v));
  }
  return rows.filter((r) => checks.every((c) => c(r)));
}

function orderRows(rows, spec) {
  if (!spec) return rows;
  const keys = splitTop(spec).map((s) => {
    const [col, ...mods] = s.split(".");
    const desc = mods.includes("desc");
    const nullsFirst = mods.includes("nullsfirst") || (desc && !mods.includes("nullslast"));
    return { col, desc, nullsFirst };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsFirst } of keys) {
      const x = getPath(a, col), y = getPath(b, col);
      if (x == null && y == null) continue;
      if (x == null) return nullsFirst ? -1 : 1;
      if (y == null) return nullsFirst ? 1 : -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : cmp(x, String(y));
      if (c) return desc ? -c : c;
    }
    return 0;
  });
}

// ---------------------------------------------------------------- select + embeds
const singulars = (t) => [...new Set([t.replace(/ies$/, "y"), t.replace(/es$/, ""), t.replace(/s$/, ""), t])];

function project(db, table, rows, select) {
  if (!select || select === "*") return rows.map((r) => ({ ...r }));
  const items = splitTop(select);
  return rows.map((row) => {
    const out = {};
    for (const item of items) {
      if (item === "*") { Object.assign(out, row); continue; }
      const m = /^(?:([\w]+):)?([\w]+)(?:!([\w]+))?(?:!inner|!left)?\((.*)\)$/s.exec(item);
      if (m) {
        const [, alias, embed, hint, sub] = m;
        out[alias || embed] = resolveEmbed(db, table, row, embed, hint, sub);
        continue;
      }
      const c = /^(?:([\w]+):)?([\w]+(?:->>?[\w]+)*)(?:::\w+)?$/.exec(item);
      if (!c) continue;
      const key = c[2];
      out[c[1] || key.split(/->>?/).pop()] = getPath(row, key) ?? null;
    }
    return out;
  });
}

function resolveEmbed(db, parentTable, row, embed, hint, sub) {
  const child = db.tables[embed] ?? [];
  const countOnly = sub.trim() === "count";
  // many-to-one: the parent carries <embed-singular>_id (or the !hint column)
  const fk = [hint, ...singulars(embed).map((s) => `${s}_id`)].find((k) => k && k in row);
  if (fk) {
    const hit = child.find((c) => c.id === row[fk]);
    return hit ? project(db, embed, [hit], sub)[0] : null;
  }
  // one-to-many: the child carries <parent-singular>_id
  const back = singulars(parentTable).map((s) => `${s}_id`).find((k) => child.some((c) => k in c));
  const kids = back ? child.filter((c) => c[back] === row.id) : [];
  return countOnly ? [{ count: kids.length }] : project(db, embed, kids, sub);
}

// ---------------------------------------------------------------- auth
const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function fakeJwt(user) {
  const iat = Math.floor(Date.now() / 1000);
  return `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({
    sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", iat, exp: iat + 3600,
    aal: "aal1", amr: [{ method: "password", timestamp: iat }], session_id: randomUUID(),
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, is_anonymous: false,
  })}.${b64u("demo-signature")}`;
}
function userObj(u) {
  const t = "2026-01-01T00:00:00Z";
  return {
    id: u.id, aud: "authenticated", role: "authenticated", email: u.email, phone: "",
    email_confirmed_at: t, confirmed_at: t, last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
    created_at: t, updated_at: t, is_anonymous: false,
  };
}
function session(u) {
  return {
    access_token: fakeJwt(u), token_type: "bearer", expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `demo-refresh.${u.id}`, user: userObj(u),
  };
}
function userFromBearer(db, req) {
  const tok = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const sub = JSON.parse(Buffer.from(tok.split(".")[1], "base64url").toString()).sub;
    return db.users.find((u) => u.id === sub) ?? null;
  } catch { return null; }
}

// ---------------------------------------------------------------- RPCs
function rpc(db, name, args, log) {
  const T = db.tables;
  switch (name) {
    case "founding_offer": return { total: 3, left: 3 };
    case "platform_prices": return null; // app falls back to its built-in price table
    case "job_photo_budget": return [{ used_bytes: 0, cap_bytes: 1073741824, photos: 0 }];
    case "get_business_translations": return {};
    case "get_public_business_profile_by_host": {
      const host = String(args.p_host || "").toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
      const domain = (T.business_domains || []).find(r => r.verified_at && r.domain.toLowerCase() === host);
      const business = domain && (T.businesses || []).find(r => r.id === domain.business_id);
      return business ? rpc(db, "get_public_business_profile", { p_slug: business.slug }, log) : null;
    }
    // STUDIO S8: what the planned get_published_site_by_host answers (S8-planned-migration.sql), from the Studio's
    // published.json (STUDIO_PUBLISHED; read on every call, so a publish or rollback shows at once). Only a verified
    // host, of an active business with an active website subscription, whose live release is for that business.
    case "get_published_site_by_host": {
      const host = String(args.p_host || "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "").replace(/\.$/, "");
      const domain = (T.business_domains || []).find(r => r.verified_at && r.domain.toLowerCase() === host);
      const business = domain && (T.businesses || []).find(r => r.id === domain.business_id && r.status === "active");
      const paying = business && (T.platform_subscriptions || []).some(s => s.business_id === business.id && s.plan === "website" && s.status === "active");
      if (!paying || !process.env.STUDIO_PUBLISHED) return null;
      let all = {}; try { all = JSON.parse(readFileSync(process.env.STUDIO_PUBLISHED, "utf8")); } catch { return null; }
      const live = all[host];
      return live && live.slug === business.slug && live.spec?.slug === business.slug ? { spec: live.spec, release: live.release, revision: live.revision } : null;
    }
    case "get_public_business_profile": {
      const b = (T.businesses ?? []).find((x) => x.slug === args.p_slug && x.status === "active");
      if (!b) return null;
      const mine = (t, extra = () => true) => (T[t] ?? []).filter((r) => r.business_id === b.id && extra(r));
      const sort = (rows) => orderRows(rows, "sort_order.asc,name.asc");
      const strip = (r) => { if (!r) return null; const { business_id, updated_at, ...rest } = r; return rest; };
      return {
        business: { slug: b.slug, name: b.name, timezone: b.timezone, phone: b.contact_phone, dropoff_address: b.dropoff_address, service_area: b.service_area, established_year: b.established_year, closed_until: b.closed_until ?? null },
        branding: strip(mine("business_branding")[0]),
        settings: strip(mine("business_settings")[0]),
        closures: [],
        service_groups: sort(mine("service_groups")),
        services: sort(mine("services", (r) => r.is_active !== false)),
        add_ons: sort(mine("add_ons", (r) => r.is_active !== false)),
        plans: sort(mine("plans", (r) => r.is_active !== false)),
        hours: orderRows(mine("business_hours"), "weekday.asc").map(({ weekday, open_time, close_time }) => ({ weekday, open_time, close_time })),
        testimonials: orderRows(mine("testimonials", (r) => r.is_active !== false), "sort_order.asc"),
        gallery: orderRows(mine("gallery_images", (r) => r.is_active !== false), "sort_order.asc"),
      };
    }
    default: log(`rpc ${name}: no canned value, returning null`); return null;
  }
}

async function bookingFunction(db, name, body, responses, loadEngine) {
  const T = db.tables, b = (T.businesses || []).find(r => r.slug === body.business_slug && r.status === 'active');
  const reply = (status, body) => ({status, body}), refuse = (status, error) => reply(status, {success:false,error});
  if (!b) return refuse(404, 'unknown_business');
  if (responses[name]) {
    const configured = responses[name];
    if (!Number.isInteger(configured.status) || configured.status < 200 || configured.status > 599 || configured.body === undefined)
      return refuse(503, 'invalid_demo_response');
    return structuredClone(configured);
  }
  let E;
  try { E = await loadEngine(); } catch { return refuse(503, 'shared_pricing_unavailable'); }
  const mine = table => (T[table] || []).filter(r => r.business_id === b.id);
  const settings = mine('business_settings')[0] || {}, timezone = b.timezone || 'America/Los_Angeles';
  const request=JSON.stringify(body),ref=name==='create-booking' && body.booking_ref ? `${b.id}:${body.booking_ref}` : null;
  const previous=ref && db.bookingRefs.get(ref);
  if (previous) return previous.request===request ? reply(200,previous.body) : refuse(409,'duplicate_reference');
  const problem = (status, message) => { throw Object.assign(Error(message), {status}); };
  const select = (table, ids) => {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) problem(400,'invalid_selection');
    const rows = mine(table).filter(r => ids.includes(r.id) && r.is_active !== false);
    if (rows.length !== ids.length) problem(400,'invalid_selection');
    return rows;
  };
  const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && Number.isFinite(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10) === d;
  const minute = s => Number(s.slice(0,2))*60 + Number(s.slice(3,5));
  const clock = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const instant = (date,time) => E.localDateTimeToInstant(timezone,date,time);
  const type = body.service_type === 'dropoff' ? 'dropoff' : 'mobile';
  const slotsFor = (date,duration,services) => {
    const weekday = E.weekdayOf(date), hours = mine('booking_hours_overrides').find(r => r.date === date) || mine('business_hours').find(r => r.weekday === weekday);
    const result = {open:false,slots:[],dropoff_slots:[],mobile_slots:[],dropoff_only:false,mobile_only:false,hours:null};
    const advance = (Date.parse(date+'T00:00:00Z')-Date.parse(E.dateStrIn(timezone)+'T00:00:00Z'))/86400000;
    if (advance < 0 || advance > (settings.max_advance_days ?? 60) || b.closed_until && date < b.closed_until || !hours?.open_time || !hours.close_time ||
        services.some(r => r.available_weekdays?.length && !r.available_weekdays.includes(weekday))) return result;
    result.hours = {start:hours.open_time.slice(0,5),end:hours.close_time.slice(0,5)};
    const step = Math.max(5,Number(settings.slot_interval_minutes)||30), buffer = Math.max(0,Number(settings.buffer_minutes)||0);
    for (let m=minute(hours.open_time); m+duration<=minute(hours.close_time); m+=step) {
      const time=clock(m), start=+instant(date,time), end=start+duration*60000;
      if (start < Date.now()+(settings.min_advance_minutes || 0)*60000) continue;
      const occupied=mine('bookings').filter(r => r.status!=='cancelled' && r.bulk_vehicle_count==null && !r.deleted_at);
      if (occupied.some(r => start <= Date.parse(r.end_at)+buffer*60000 && end >= Date.parse(r.start_at)-buffer*60000)) continue;
      if (mine('blockout_dates').some(r => date >= r.start_date && date <= r.end_date &&
        (r.all_day || (r.start_time || r.end_time) && m < minute(r.end_time || '23:59') && m+duration > minute(r.start_time || '00:00')))) continue;
      const dayBookings=occupied.filter(r => E.dateStrIn(timezone,new Date(r.start_at)) === date);
      if (settings.max_bookings_per_day!=null && dayBookings.length >= settings.max_bookings_per_day) continue;
      const mobile=settings.mobile_enabled!==false && services.every(r => r.allows_mobile!==false);
      const dropoff=settings.dropoff_enabled!==false && services.every(r => r.allows_dropoff!==false);
      const restricts=mode => mine('dropoff_only_periods').some(r => (r.mode || 'dropoff')===mode && date>=r.start_date &&
        (!r.end_date || date<=r.end_date) && (!r.start_time || !r.end_time || m<minute(r.end_time) && m+duration>minute(r.start_time)));
      const dropoffOnly=!mobile || restricts('dropoff'), mobileOnly=!dropoff || restricts('mobile');
      if (dropoffOnly && mobileOnly) continue;
      result.slots.push(time);
      if (mobileOnly) result.mobile_slots.push(time); if (dropoffOnly) result.dropoff_slots.push(time);
    }
    result.open=true;
    result.dropoff_only=result.slots.length>0 && result.dropoff_slots.length===result.slots.length;
    result.mobile_only=result.slots.length>0 && result.mobile_slots.length===result.slots.length;
    return result;
  };
  try {
    if (name === 'available-slots') {
      const start=body.start_date || body.booking_date, end=body.end_date || body.booking_date || start, duration=Number(body.duration_minutes);
      if (!validDate(start) || !validDate(end) || start>end || (Date.parse(end)-Date.parse(start))/86400000>92 ||
          !Number.isFinite(duration) || duration<=0 || duration>1440) return refuse(400,'invalid_slot_request');
      const services=body.service_ids ? select('services',body.service_ids) : [], days={};
      for (let ms=Date.parse(start+'T00:00:00Z'); ms<=Date.parse(end+'T00:00:00Z'); ms+=86400000) {
        const date=new Date(ms).toISOString().slice(0,10); days[date]=slotsFor(date,duration,services);
      }
      return reply(200,body.booking_date&&!body.start_date&&!body.end_date ? {success:true,...days[start]} : {success:true,days});
    }
    const services=select('services',body.service_ids || []),addOns=select('add_ons',body.add_ons || []);
    if (!services.length) return refuse(400,'service_required');
    // The sample models one car; refuse unsupported input rather than simulate a successful split booking.
    if (body.extra_vehicles?.length) return refuse(400,'offline_single_vehicle_only');
    for (const group of mine('service_groups')) if (group.max_select>0 && services.filter(s => s.group_id===group.id).length>group.max_select) return refuse(400,'group_selection_limit');
    if (settings[type+'_enabled']===false || services.some(s => s['allows_'+type]===false)) return refuse(400,'service_mode_unavailable');
    const plan=body.plan_id ? mine('plans').find(p => p.id===body.plan_id && p.is_active!==false) : null;
    if (body.plan_id && !plan) return refuse(400,'invalid_plan');
    const code=String(body.applied_promo_code || '').trim().toUpperCase();
    const promo=code ? mine('promo_codes').find(p => p.code===code && p.is_active!==false &&
      (!p.expires_at || p.expires_at>=new Date().toISOString()) && (!p.usage_limit || (p.times_used || 0)<p.usage_limit)) : null;
    if (code && !promo) return refuse(409,'invalid_promo');
    if (body.booking_date && !validDate(body.booking_date)) return refuse(400,'invalid_date');
    if (body.start_time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body.start_time)) return refuse(400,'invalid_time');
    const travel=E.resolveTravel(settings,type,body.travel_zone);
    const vehicles=E.resolveVehicles(settings.vehicle_sizes || [],body.vehicle_size,[],1);
    const q=E.computeQuote({services,addOns,vehicleSize:vehicles[0].key,
      siteDiscountPercent:settings.site_discount_active ? Number(settings.site_discount_percent)||0 : 0,
      promo:promo ? {type:promo.type,value:promo.value} : null,roundingNearest:Number(settings.price_rounding_nearest)||0,
      travelFee:travel.fee,plan:E.planInputFor(plan),
      adjustments:E.matchPriceRules(settings.price_rules,E.whenContextFor(timezone,body.booking_date,body.start_time,E.localDateTimeToInstant,E.weekdayOf))});
    const quote={base_price:q.basePrice,vehicle_size_fee:q.sizeAdd,add_ons_total:q.addOnsTotal,travel_fee:q.travelFee,travel_zone:travel.zone,
      adjustments:q.adjustmentLines,subtotal_before_discounts:q.subtotalBase,site_discount:q.siteDiscount,
      site_discount_percent:settings.site_discount_active ? Number(settings.site_discount_percent)||0 : 0,
      site_discount_label:settings.site_discount_label || null,subtotal:q.subtotalAfterSite,promo_code:promo?.code || null,
      promo_discount:q.promoDiscount,total:q.total,total_duration:q.totalDurationMinutes,buffer_minutes:settings.buffer_minutes || 0,
      vehicle_count:1,per_vehicle:null,single_vehicle_duration:q.totalDurationMinutes,plan_id:plan?.id || null,plan_name:plan?.name || null};
    if (name === 'calculate-booking') return reply(200,{success:true,weather:null,quote});
    if (typeof body.customer_name!=='string' || !body.customer_name.trim() || String(body.customer_phone || '').replace(/\D/g,'').length<10 ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.customer_email || '') || !validDate(body.booking_date) || !body.start_time)
      return refuse(400,'customer_and_time_required');
    if (body.shown_total != null && (!Number.isFinite(Number(body.shown_total)) || Math.abs(Number(body.shown_total)-q.total)>.005)) return refuse(409,'price_changed');
    const slots=slotsFor(body.booking_date,q.totalDurationMinutes,services);
    if (!slots.slots.includes(body.start_time) || (type==='mobile' ? slots.dropoff_slots : slots.mobile_slots).includes(body.start_time)) return refuse(409,'slot_taken');
    const start_at=instant(body.booking_date,body.start_time).toISOString(),end_at=new Date(Date.parse(start_at)+q.totalDurationMinutes*60000).toISOString();
    const customers=T.customers ||= [], bookings=T.bookings ||= [];
    let customer=customers.find(c => c.business_id===b.id && c.phone===body.customer_phone);
    if (!customer) {customer={id:randomUUID(),business_id:b.id,name:body.customer_name.trim(),phone:body.customer_phone,email:body.customer_email,address:body.customer_address || null,created_at:new Date().toISOString()};customers.push(customer);}
    const row={id:randomUUID(),business_id:b.id,customer_id:customer.id,customer_name:body.customer_name.trim(),
      customer_phone:body.customer_phone,customer_email:body.customer_email,customer_address:body.customer_address || null,
      service_type:type,vehicle_size:vehicles[0].key,vehicle_model:body.vehicle_model || null,start_at,end_at,
      subtotal:q.subtotalAfterSite,total_price:q.total,vehicle_size_fee:q.sizeAdd,travel_fee:q.travelFee,
      discount_amount:q.siteDiscount+q.promoDiscount,promo_code:promo?.code || null,status:settings.booking_mode==='request'||plan?'pending':'confirmed',
      payment_status:'unpaid',customer_notes:body.customer_notes || null,created_at:new Date().toISOString()};
    bookings.push(row);
    for (const [table,rows,fk] of [['booking_services',services,'service_id'],['booking_add_ons',addOns,'add_on_id']])
      for (const s of rows) {
        const adjustment=table==='booking_services' ? E.sizeAdjustmentFor(s,vehicles[0].key) : {price:0,duration_minutes:0};
        (T[table] ||= []).push({id:randomUUID(),business_id:b.id,booking_id:row.id,[fk]:s.id,name_at_booking:s.name,
          price_at_booking:Number(s.price)+adjustment.price,duration_at_booking:Number(s.duration_minutes)+adjustment.duration_minutes});
      }
    if (promo) promo.times_used=(promo.times_used || 0)+1;
    const answer={success:true,booking:{id:row.id,booking_date:body.booking_date,start_time:body.start_time,
      end_time:E.timeStrIn(timezone,new Date(end_at)),total_price:q.total,status:row.status,receipt_url:`/booking/${row.id}`}};
    if (ref) db.bookingRefs.set(ref,{request,body:answer}); return reply(200,answer);
  } catch (e) { return refuse(e.status || 500,e.message); }
}

// ---------------------------------------------------------------- HTTP
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
const parseJson = (buf) => { try { return buf.length ? JSON.parse(buf.toString()) : null; } catch { return null; } };

function cors(req) {
  return {
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"]
      || "authorization,apikey,content-type,x-client-info,prefer,range,accept-profile,content-profile,x-supabase-api-version,x-upsert,cache-control",
    "Access-Control-Expose-Headers": "Content-Range,Range,Content-Location,Content-Disposition,X-Supabase-Api-Version",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function startDemoBackend({ port = 54390, seed = path.join(HERE, "demo-seed.json"), host = "127.0.0.1", quiet = false,
  responses = {}, platform = process.env.SITE_ACCEPTANCE_PLATFORM || path.resolve(HERE, "../..") } = {}) {
  const db = loadSeed(seed);
  db.bookingRefs = new Map();
  const calls = [];
  // Load only for booking calls: other dashboard demos remain independent of the product checkout.
  let shared;
  const loadEngine = () => shared ||= Promise.all(["pricing.ts", "tz.ts"].map(f =>
    import(pathToFileURL(path.join(platform, "supabase/functions/_shared", f)).href))).then(([pricing, tz]) => ({ ...pricing, ...tz }));
  const said = new Set();
  const log = (msg) => { if (!quiet && !said.has(msg)) { said.add(msg); process.stderr.write(`[demo-backend] ${msg}\n`); } };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let call = null;
    const send = (status, body, headers = {}) => {
      if (call) call.status = status;
      const isBuf = Buffer.isBuffer(body);
      const payload = body === undefined || body === null && status === 204 ? "" : isBuf ? body : JSON.stringify(body);
      res.writeHead(status, {
        ...cors(req), ...(isBuf ? {} : { "Content-Type": "application/json; charset=utf-8" }),
        "Content-Length": Buffer.byteLength(payload), ...headers, // explicit length: Chromium aborts a HEAD without one
      });
      res.end(req.method === "HEAD" ? undefined : payload);
    };
    if (req.method === "OPTIONS") return send(204, null);
    const buf = await readBody(req);
    const p = url.pathname;
    if (p.startsWith("/functions/v1/") || p.startsWith("/rest/v1/rpc/")) {
      call = { method: req.method, path: p, body: parseJson(buf), status: null, at: new Date().toISOString() }; calls.push(call);
    }
    try {
      if (p === "/__demo/calls") return req.method === "GET" ? send(200, calls) : send(405, { error: "method_not_allowed" });
      // ------------------------------------------------ lab: the belt's page check resets the data before each flow,
      // then applies the flow's "setup" (patch matching rows of one table), so a flow can start from "no sale set".
      if (p === "/__demo/reset" && req.method === "POST") {
        calls.length = 0; db.bookingRefs.clear();
        const fresh = loadSeed(seed); db.tables = fresh.tables; db.users = fresh.users;
        const setup = Array.isArray(parseJson(buf)?.setup) ? parseJson(buf).setup.slice(0, 10) : [];
        const done = [];
        for (const s of setup) {
          const rows = db.tables[s?.table]; if (!Array.isArray(rows) || !s.set || typeof s.set !== "object") continue;
          let n = 0; for (const r of rows) if (Object.entries(s.match || {}).every(([k, v]) => r[k] === v)) { Object.assign(r, s.set); n++; }
          done.push({ table: s.table, rows: n });
        }
        return send(200, { ok: true, setup: done });
      }
      // lab 2026-10-18: a flow may ask what the screen actually saved (rows of one table matching scalar values).
      if (p === "/__demo/rows" && req.method === "POST") {
        const q = parseJson(buf) || {}, rows = Array.isArray(db.tables[q.table]) ? db.tables[q.table] : [];
        const hits = rows.filter((r) => Object.entries(q.match || {}).every(([k, v]) => r[k] === v || (typeof r[k] === "number" && Number(v) === r[k]) || (typeof v === "number" && Number(r[k]) === v)));
        return send(200, { ok: true, count: hits.length, rows: hits.slice(0, 5) });
      }
      // ------------------------------------------------ auth
      if (p.startsWith("/auth/v1/")) {
        const what = p.slice(9);
        const body = parseJson(buf) ?? {};
        if (what === "token") {
          const grant = url.searchParams.get("grant_type");
          let u;
          if (grant === "refresh_token") u = db.users.find((x) => `demo-refresh.${x.id}` === body.refresh_token);
          else u = db.users.find((x) => x.email?.toLowerCase() === String(body.email || "").toLowerCase()) ?? db.users[0];
          if (!u) return send(400, { error: "invalid_grant", error_description: "Invalid Refresh Token", code: 400 });
          return send(200, session(u));
        }
        if (what === "user") {
          const u = userFromBearer(db, req);
          return u ? send(200, userObj(u)) : send(401, { code: 401, msg: "invalid JWT", error_code: "bad_jwt" });
        }
        if (what === "logout") return send(204, null);
        if (what === "settings") {
          return send(200, { external: { email: true, google: true, phone: false }, disable_signup: false, mailer_autoconfirm: true, phone_autoconfirm: false, sms_provider: "" });
        }
        log(`auth ${req.method} /${what}: answered {}`);
        return send(200, {});
      }

      // ------------------------------------------------ functions
      if (p.startsWith("/functions/v1/")) {
        const name = p.slice(14);
        if (["calculate-booking", "available-slots", "create-booking"].includes(name)) {
          if (req.method !== "POST") return send(405, { success: false, error: "method_not_allowed" });
          const body = parseJson(buf);
          if (!body || typeof body !== "object" || Array.isArray(body)) return send(400, { success: false, error: "invalid_json" });
          const result = await bookingFunction(db, name, body, responses, loadEngine);
          return send(result.status, result.body);
        }
        log(`function ${p.slice(14)}: answered {}`);
        return send(200, {});
      }

      // ------------------------------------------------ storage
      if (p.startsWith("/storage/v1/")) {
        const rest = p.slice(12);
        if (rest.startsWith("object/list/")) return send(200, []);
        if (/^object\/(public|authenticated|sign)\//.test(rest) && req.method === "GET") return send(200, PNG_1x1, { "Content-Type": "image/png" });
        if (rest.startsWith("render/image/")) return send(200, PNG_1x1, { "Content-Type": "image/png" });
        if (rest.startsWith("object/sign/") && req.method === "POST") {
          const b = parseJson(buf) ?? {};
          const bucket = rest.slice(12).split("/")[0];
          if (Array.isArray(b.paths)) return send(200, b.paths.map((x) => ({ path: x, error: null, signedURL: `/object/sign/${bucket}/${x}?token=demo` })));
          return send(200, { signedURL: `/${rest}?token=demo` });
        }
        if (req.method === "DELETE") return send(200, []);
        if (rest.startsWith("bucket")) return send(200, []);
        return send(200, { Key: rest.replace(/^object\//, ""), Id: randomUUID() });
      }

      // ------------------------------------------------ rest
      if (!p.startsWith("/rest/v1/")) return send(404, { message: `demo-backend: no route for ${p}` });
      const name = decodeURIComponent(p.slice(9));
      const params = [...url.searchParams.entries()];
      const accept = req.headers.accept || "";
      const wantsObject = accept.includes("application/vnd.pgrst.object+json");
      const prefer = req.headers.prefer || "";

      if (name.startsWith("rpc/")) {
        const args = req.method === "GET" ? Object.fromEntries(url.searchParams) : (parseJson(buf) ?? {});
        return send(200, rpc(db, name.slice(4), args, log));
      }
      if (!(name in db.tables)) {
        log(`table ${name}: not in seed, treated as empty`);
        db.tables[name] = [];
      }
      const table = db.tables[name];
      const select = url.searchParams.get("select");

      const respond = (rows, status, extraHeaders = {}) => {
        if (wantsObject) {
          if (rows.length !== 1) {
            return send(406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" });
          }
          return send(status, rows[0], extraHeaders);
        }
        return send(status, rows, extraHeaders);
      };

      if (req.method === "GET" || req.method === "HEAD") {
        let rows = orderRows(filterRows(table, params), url.searchParams.get("order"));
        const total = rows.length;
        let from = Number(url.searchParams.get("offset") ?? 0);
        let to = url.searchParams.has("limit") ? from + Number(url.searchParams.get("limit")) - 1 : Infinity;
        const range = /^(\d+)-(\d*)$/.exec(req.headers.range || "");
        if (range) { from = Number(range[1]); if (range[2] !== "") to = Number(range[2]); }
        rows = rows.slice(from, to === Infinity ? undefined : to + 1);
        const counted = /count=(exact|planned|estimated)/.test(prefer);
        const cr = rows.length ? `${from}-${from + rows.length - 1}/${counted ? total : "*"}` : `*/${counted ? total : "*"}`;
        return respond(project(db, name, rows, select), 200, { "Content-Range": cr });
      }

      const representation = prefer.includes("return=representation");
      const done = (rows, status) => (representation ? respond(project(db, name, rows, select), status) : send(status === 201 ? 201 : 204, null));

      if (req.method === "POST") {
        const body = parseJson(buf);
        const incoming = Array.isArray(body) ? body : body ? [body] : [];
        const conflictCols = (url.searchParams.get("on_conflict") || "id").split(",");
        const merge = prefer.includes("resolution=merge-duplicates");
        const ignore = prefer.includes("resolution=ignore-duplicates");
        const out = [];
        const now = new Date().toISOString();
        for (const r of incoming) {
          const existing = (merge || ignore) && conflictCols.every((c) => r[c] !== undefined)
            ? table.find((t) => conflictCols.every((c) => String(t[c]) === String(r[c]))) : null;
          if (existing) { if (merge) Object.assign(existing, r, { updated_at: now }); if (merge) out.push(existing); continue; }
          const row = { id: randomUUID(), created_at: now, ...r };
          table.push(row); out.push(row);
        }
        return done(out, 201);
      }
      if (req.method === "PATCH") {
        const patch = parseJson(buf) ?? {};
        const rows = filterRows(table, params);
        for (const r of rows) Object.assign(r, patch);
        return done(rows, 200);
      }
      if (req.method === "DELETE") {
        const rows = filterRows(table, params);
        db.tables[name] = table.filter((r) => !rows.includes(r));
        return done(rows, 200);
      }
      return send(405, { message: `demo-backend: ${req.method} not supported` });
    } catch (e) {
      log(`error on ${req.method} ${req.url}: ${e.stack || e}`);
      return send(500, { message: String(e.message || e) });
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({ url: `http://${host}:${actual}`, port: actual, db, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  startDemoBackend({ port: Number(arg("--port", 54390)), seed: path.resolve(arg("--seed", path.join(HERE, "demo-seed.json"))) })
    .then(({ port }) => console.log(JSON.stringify({ ok: true, port })))
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e.message || e) })); process.exit(1); });
}
