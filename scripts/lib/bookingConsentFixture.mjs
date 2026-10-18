// Executes the REAL create-booking handler and consent helper. All imported
// dependencies are explicit stand-ins; no environment or network is available.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// ROADMAP 97.18 — the handler's day-rule mapping, taken from slotValidation.ts's own text so the fixture
// runs the production mapping rather than a copy of it.
const dayRuleSrc = /export const DAY_FULL[\s\S]*?code === "BK002" \? TOO_CLOSE : null;/.exec(readFileSync('supabase/functions/_shared/slotValidation.ts', 'utf8'))?.[0];
if (!dayRuleSrc) throw Error('slotValidation.ts no longer holds DAY_FULL / TOO_CLOSE / dayRuleRefusal');
export const { DAY_FULL, TOO_CLOSE, dayRuleRefusal } = new Function(stripTypeScriptTypes(dayRuleSrc).replace(/export /g, '') + '; return { DAY_FULL, TOO_CLOSE, dayRuleRefusal };')();

export function bookingFixture({ consentBreak = '', existing = null, member = null, refused = false, duplicate = false, collision = false, bookingId = 'booking-a', failedWrite = false, handlerBreak = '', srcPatch = [], deps = {}, tables = {}, rpc = null, quoteTotal = 185 } = {}) {
  let helperSrc = readFileSync('supabase/functions/_shared/bookingConsent.ts', 'utf8');
  if (consentBreak === 'save') {
    const changed = helperSrc.replace('sms_consent_source: "booking_form"', 'sms_consent_source: "owner_entered"');
    if (changed === helperSrc) throw Error('Save sabotage did not land'); helperSrc = changed;
  }
  if (consentBreak === 'strict') {
    const changed = helperSrc.replace('consent !== true', '!consent');
    if (changed === helperSrc) throw Error('Strict sabotage did not land'); helperSrc = changed;
  }
  const helperErrors = [];
  const helper = new Function('console',stripTypeScriptTypes(helperSrc).replace('export ', '') + '; return saveBookingSmsConsent;')({error(...args) { helperErrors.push(args.map(String).join(' ')); }});
  const rows = { customers: [
    ...(existing ? [{ business_id: 'tenant-a', id: 'customer-a', phone: '(555) 012-3456', sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null, ...existing }] : []),
    { business_id: 'tenant-b', id: 'customer-b', phone: '(555) 012-3456', sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null },
  ], bookings: [], booking_services: [], booking_add_ons: [], ...tables };
  const operations = [], sends = [], errors = [];
  // 97.2 — the private columns a real row carries, so a duplicate answer that
  // hands back the row is caught by its keys.
  const oldBooking = { id: bookingId, business_id: 'tenant-a', customer_id: 'customer-a', customer_phone: '(555) 012-3456', customer_name: 'Maria Lopez', status: 'confirmed', start_at: '2026-10-30T17:00:00.000Z', end_at: '2026-10-30T18:00:00.000Z', deleted_at: null,
    customer_email: 'maria@example.invalid', customer_address: '9 Private Ln', customer_notes: 'gate code 1234', admin_notes: 'owner-only note', total_price: 185 };
  if (duplicate) rows.bookings.push(oldBooking);
  const db = {
    from(table) {
      if (!rows[table]) throw Error('Fixture needs table ' + table);
      const filters = [], query = { table, operation: 'read', value: null, cols: null };
      const chain = {
        // A column list is honoured, as PostgREST does; none or "*" is the whole row.
        select(cols) { if (cols && cols.trim() !== '*') query.cols = cols.split(',').map(c => c.trim()); return chain; }, eq(k,v) { filters.push(r => r[k] === v); return chain; },
        neq(k,v) { filters.push(r => r[k] !== v); return chain; },
        // 97.9 — ilike as a case-blind equality (no wildcards are sent), limit
        // as a slice. `or` is NOT honoured: resolvePromo's expiry filter passes
        // every row, so a fixture promo must not expire.
        ilike(k,v) { filters.push(r => String(r[k] ?? '').toLowerCase() === String(v).toLowerCase()); return chain; },
        limit(n) { query.limit = n; return chain; }, or() { return chain; },
        in(k,vs) { filters.push(r => vs.includes(r[k])); return chain; },
        is(k,v) { filters.push(r => (r[k] ?? null) === v); return chain; },
        insert(value) { query.operation = 'insert'; query.value = value; return chain; },
        update(value) { query.operation = 'update'; query.value = value; return chain; },
        single() { return execute(true); }, maybeSingle() { return execute(true); },
        then(resolve,reject) { return execute(false).then(resolve,reject); },
      };
      async function execute(single) {
        operations.push({ ...query });
        const pick = r => query.cols ? Object.fromEntries(query.cols.map(c => [c, r[c]])) : r;
        if (query.operation === 'insert') {
          if (collision && table === 'bookings') { rows.bookings.push(oldBooking); return { error: { code: collision === true ? '23P01' : collision }, data: null }; }
          const created = (Array.isArray(query.value) ? query.value : [query.value]).map((value,i) => ({ id: table === 'customers' ? 'customer-a' : table === 'bookings' && rows.bookings.length ? 'booking-' + (rows.bookings.length + 1) : bookingId, ...(table === 'bookings' ? { created_at: new Date().toISOString() } : {}), sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null, ...value }));
          rows[table].push(...created); return { data: single ? pick(created[0]) : created.map(pick), error: null };
        }
        const found = rows[table].filter(r => filters.every(f => f(r))).slice(0, query.limit ?? Infinity);
        if (query.operation === 'update') {
          if (failedWrite) return { error: new Error('Consent write refused'), data: null };
          found.forEach(r => Object.assign(r,query.value));
        }
        return { data: single ? (found[0] ? pick(found[0]) : null) : found.map(pick), error: null };
      }
      return chain;
    },
    // ROADMAP 97.18 — create-booking writes its booking through insert_booking_checked; answered as the same
    // bookings insert, `collision` included (a BK001/BK002 code is a racing booking refused by the day rules).
    rpc(name, args) {
      if (name === 'insert_booking_checked') return db.from('bookings').insert(args.p_row).select().single();
      if (!rpc) throw Error('Unexpected RPC'); return rpc(name, args, rows);
    },
  };
  const business = { id: 'tenant-a', slug: 'consent-proof', name: "Andrew's Auto Detail", timezone: 'America/Los_Angeles' };
  const settings = { email_customer_confirmation: true, email_owner_new_booking: false, push_enabled: false, booking_mode: 'reserve', vehicle_sizes: [{ key:'small',label:'Small' }] };
  const pricing = { sizeAdd:0, total:quoteTotal, subtotalAfterSite:quoteTotal, totalDurationMinutes:60, adjustmentLines:[], travelFee:0, siteDiscount:0, promoDiscount:0 };
  let handler;
  const dependencies = {
    Deno: { serve(fn) { handler = fn; } }, supabase: db,
    console: { error(...args) { errors.push(args.map(String).join(' ')); }, warn(...args) { errors.push(args.map(String).join(' ')); } },
    json: (data,status = 200) => ({ status, data }), preflight: () => ({ status:204 }), langOf: l => l === 'es' ? 'es' : 'en',
    businessBySlug: async () => business, getSettings: async () => settings, requireMember: async () => member,
    resolveServices: async () => [{ id:'service-a',name:'Full detail',price:185,duration_minutes:60 }], resolveAddOns: async () => [],
    resolvePromo: async () => null, resolvePlan: async () => null, resolveVehicles: () => [{ key:'small',label:'Small' }],
    resolveTravel: () => ({ fee:0,zone:null }), whenContextFor: () => ({}), matchPriceRules: () => [], planInputFor: () => null,
    computeQuote: () => pricing, sizeAdjustmentFor: () => ({ price:0,duration_minutes:0 }),
    localDateTimeToInstant: () => new Date('2026-10-30T17:00:00Z'), weekdayOf: () => 5,
    validateSlot: async () => refused ? { ok:false,status:409,error:'This time is no longer available.' } : { ok:true,startAt:new Date('2026-10-30T17:00:00Z'),endAt:new Date('2026-10-30T18:00:00Z') },
    looksAutomated: () => false, withinLimits: async () => true, ipOf: () => 'fixture', LIMITS: {},
    buildBrand: async () => ({}), siteFor: async () => 'https://detailingplatform.com', receiptUrl: (base,id) => base + '/booking/' + id,
    timeStrIn: () => '10:00', customerConfirmationEmail: () => ({ subject:'Confirmation',html:'stub',text:'stub' }),
    sendTenantEmail: async message => { sends.push(message); }, saveBookingSmsConsent: helper, dayRuleRefusal,
    ...deps,
  };
  let src = readFileSync('supabase/functions/create-booking/index.ts','utf8');
  if (handlerBreak === 'plan-refusal') { const changed = src.replace('if (body.plan_id && body.group_with)', 'if (false)'); if (changed === src) throw Error('Plan-refusal sabotage did not land'); src = changed; }
  if (handlerBreak === 'price-guard') { const changed = src.replace('if (body.shown_total != null &&', 'if (false &&'); if (changed === src) throw Error('Price-guard sabotage did not land'); src = changed; }
  for (const [from, to] of srcPatch) {
    if (!src.includes(from)) throw Error('Source sabotage did not land: ' + from);
    src = src.split(from).join(to);
  }
  src = src.replace(/^import\s+(?:"[^"\n]+"|[\s\S]*?\sfrom\s+"[^"\n]+")\s*;\s*$/gm,'');
  const names = Object.keys(dependencies);
  // stripTypeScriptTypes is the parser, rather than node --check on TS (gotcha 101).
  new Function(...names, stripTypeScriptTypes(src))(...names.map(k => dependencies[k]));
  if (!handler) throw Error('create-booking handler did not load');
  return { rows, db, operations, sends, errors, helperErrors, helper, failWrites(value) { failedWrite = value; }, save: (...args) => helper(db,...args),
    async book(payload) { return handler({ method:'POST',json:async () => payload }); },
  };
}

export const fixtureBooking = { business_slug:'consent-proof',customer_name:'Maria Lopez',customer_phone:'(555) 012-3456',customer_email:'maria@example.invalid',service_type:'dropoff',vehicle_size:'small',service_ids:['service-a'],booking_date:'2026-10-30',start_time:'10:00' };

// ROADMAP 97.8 — answer a browser walk's create-booking call with the REAL
// handler above (fake database, quote stubbed to `total`), so a walk and its
// canary exercise the production guard rather than a copy of it. `guardOff`
// is the same text sabotage the handler test uses. `saved` is what the handler
// actually wrote to bookings.total_price.
export async function answerCreateBooking(route, body, { total, guardOff = false }) {
  const f = bookingFixture({ quoteTotal: total, handlerBreak: guardOff ? 'price-guard' : '' });
  const r = await f.book(body);
  await route.fulfill({ status: r.status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.data) });
  return { status: r.status, data: r.data, saved: f.rows.bookings.map((b) => Number(b.total_price)), errors: f.errors };
}
