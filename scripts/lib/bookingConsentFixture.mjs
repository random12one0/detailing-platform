// Executes the REAL create-booking handler and consent helper. All imported
// dependencies are explicit stand-ins; no environment or network is available.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

export function bookingFixture({ consentBreak = '', existing = null, member = null, refused = false, duplicate = false, collision = false, failedWrite = false } = {}) {
  let helperSrc = readFileSync('supabase/functions/_shared/bookingConsent.ts', 'utf8');
  if (consentBreak === 'save') {
    const changed = helperSrc.replace('sms_consent_source: "booking_form"', 'sms_consent_source: "owner_entered"');
    if (changed === helperSrc) throw Error('Save sabotage did not land'); helperSrc = changed;
  }
  if (consentBreak === 'strict') {
    const changed = helperSrc.replace('consent !== true', '!consent');
    if (changed === helperSrc) throw Error('Strict sabotage did not land'); helperSrc = changed;
  }
  const helper = new Function(stripTypeScriptTypes(helperSrc).replace('export ', '') + '; return saveBookingSmsConsent;')();
  const rows = { customers: [
    ...(existing ? [{ business_id: 'tenant-a', id: 'customer-a', phone: '555-0123', sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null, ...existing }] : []),
    { business_id: 'tenant-b', id: 'customer-b', phone: '555-0123', sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null },
  ], bookings: [], booking_services: [], booking_add_ons: [] };
  const operations = [], sends = [], errors = [];
  const oldBooking = { id: 'booking-a', business_id: 'tenant-a', customer_id: 'customer-a', customer_phone: '555-0123', customer_name: 'Maria Lopez', status: 'confirmed', start_at: '2026-10-30T17:00:00.000Z', deleted_at: null };
  if (duplicate) rows.bookings.push(oldBooking);
  const db = {
    from(table) {
      if (!rows[table]) throw Error('Fixture needs table ' + table);
      const filters = [], query = { table, operation: 'read', value: null };
      const chain = {
        select() { return chain; }, eq(k,v) { filters.push(r => r[k] === v); return chain; },
        neq(k,v) { filters.push(r => r[k] !== v); return chain; },
        is(k,v) { filters.push(r => (r[k] ?? null) === v); return chain; },
        insert(value) { query.operation = 'insert'; query.value = value; return chain; },
        update(value) { query.operation = 'update'; query.value = value; return chain; },
        single() { return execute(true); }, maybeSingle() { return execute(true); },
        then(resolve,reject) { return execute(false).then(resolve,reject); },
      };
      async function execute(single) {
        operations.push({ ...query });
        if (query.operation === 'insert') {
          if (collision && table === 'bookings') { rows.bookings.push(oldBooking); return { error: { code: '23P01' }, data: null }; }
          const created = (Array.isArray(query.value) ? query.value : [query.value]).map((value,i) => ({ id: table === 'customers' ? 'customer-a' : 'booking-a', sms_consent_at: null, sms_consent_source: null, sms_stopped_at: null, ...value }));
          rows[table].push(...created); return { data: single ? created[0] : created, error: null };
        }
        const found = rows[table].filter(r => filters.every(f => f(r)));
        if (query.operation === 'update') {
          if (failedWrite) return { error: new Error('Consent write refused'), data: null };
          found.forEach(r => Object.assign(r,query.value));
        }
        return { data: single ? found[0] || null : found, error: null };
      }
      return chain;
    },
    rpc() { throw Error('Unexpected RPC'); },
  };
  const business = { id: 'tenant-a', slug: 'consent-proof', name: "Andrew's Auto Detail", timezone: 'America/Los_Angeles' };
  const settings = { email_customer_confirmation: true, email_owner_new_booking: false, push_enabled: false, booking_mode: 'reserve', vehicle_sizes: [{ key:'small',label:'Small' }] };
  const pricing = { sizeAdd:0, total:185, subtotalAfterSite:185, totalDurationMinutes:60, adjustmentLines:[], travelFee:0, siteDiscount:0, promoDiscount:0 };
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
    sendTenantEmail: async message => { sends.push(message); }, saveBookingSmsConsent: helper,
  };
  let src = readFileSync('supabase/functions/create-booking/index.ts','utf8');
  src = src.replace(/^import\s+(?:"[^"\n]+"|[\s\S]*?\sfrom\s+"[^"\n]+")\s*;\s*$/gm,'');
  const names = Object.keys(dependencies);
  // stripTypeScriptTypes is the parser, rather than node --check on TS (gotcha 101).
  new Function(...names, stripTypeScriptTypes(src))(...names.map(k => dependencies[k]));
  if (!handler) throw Error('create-booking handler did not load');
  return { rows, operations, sends, errors, helper, save: (...args) => helper(db,...args),
    async book(payload) { return handler({ method:'POST',json:async () => payload }); },
  };
}

export const fixtureBooking = { business_slug:'consent-proof',customer_name:'Maria Lopez',customer_phone:'555-0123',customer_email:'maria@example.invalid',service_type:'dropoff',vehicle_size:'small',service_ids:['service-a'],booking_date:'2026-10-30',start_time:'10:00' };
