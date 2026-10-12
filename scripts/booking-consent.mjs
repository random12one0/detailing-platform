// 99.2f: actual public booking flow with EVERY external request intercepted.
// No login, database, provider or real sends. --capture=before precedes edits.
import { chromium } from '../app/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { freeze, differs } from '../../belt/freeze.mjs';
import { writeReceipt } from './receipt.mjs';
import { initialForm, bookingRequests } from '../app/src/book/core.js';
import { bookingFixture, fixtureBooking } from './lib/bookingConsentFixture.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:5182';
const OUT = 'C:/Users/rando/Downloads/claude/belt/shots/99.2';
const BEFORE = process.argv.includes('--capture=before');
const SERVER_ONLY = process.argv.includes('--server-only');
const BREAK = process.argv.find(a => a.startsWith('--break='))?.slice(8) || '';
if (BREAK && !['default', 'save', 'strict', 'privacy'].includes(BREAK)) throw Error('Unknown break');
const WORDS = 'Text me about my appointment. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';
const ES = 'Envíame mensajes de texto sobre mi cita. La frecuencia de los mensajes varía. Pueden aplicarse tarifas de mensajes y datos. Responde STOP para dejar de recibir mensajes o HELP para obtener ayuda.';
const profile = {
  business: { id: 'tenant-a', slug: 'consent-proof', name: "Andrew's Auto Detail", timezone: 'America/Los_Angeles', phone: '555-0100', address: '1234 Oak St' },
  branding: {}, settings: { mobile_enabled: false, dropoff_enabled: true, ask_vehicle_condition: false,
    ask_water_electric: false, water_requirement: 'not_needed', power_requirement: 'not_needed', booking_mode: 'reserve',
    cancellation_window_hours: 24, max_vehicles_per_booking: 1 },
  services: [{ id: 'service-a', name: 'Full detail', base_price: 185, duration_minutes: 60, is_active: true, sort_order: 0 }],
  add_ons: [], plans: [], service_groups: [], hours: [],
};
const quote = { subtotal: 185, subtotal_before_discounts: 185, total: 185, total_duration: 60,
  single_vehicle_duration: 60, vehicle_count: 1, adjustments: [], services: [{ id: 'service-a', name: 'Full detail', price: 185, duration_minutes: 60 }], add_ons: [] };
const started_at = new Date().toISOString(), failures = [], artifacts = [], seen = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
function check(name, ok, detail = '') { assertions++; if (!ok) failures.push(`${name}: ${detail}`); }
async function routes(page) {
  const calls = [], escaped = [];
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === BASE) {
      if (BREAK === 'default' && /\/src\/book\/core\.js/.test(url.pathname)) {
        const response = await route.fetch(), src = await response.text();
        const changed = src.replace('smsConsent: false,', 'smsConsent: true,');
        if (changed === src) throw Error('Default sabotage did not land');
        return route.fulfill({ response, body: changed + '\nwindow.__consentBreak = true;' });
      }
      if (BREAK === 'privacy' && /\/src\/landing\/legal\.js/.test(url.pathname)) {
        const response = await route.fetch(), src = await response.text();
        const changed = src.replace('Mobile information is not sold or shared with third parties for marketing or promotional purposes.', 'Mobile information may be shared.');
        if (changed === src) throw Error('Privacy sabotage did not land');
        return route.fulfill({ response, body: changed + '\nwindow.__privacyBreak = true;' });
      }
      return route.continue();
    }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return route.continue();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = {};
    if (/get_public_business_profile$/.test(url.pathname)) body = profile;
    else if (/get_business_translations$/.test(url.pathname)) body = {};
    else if (/calculate-booking$/.test(url.pathname)) body = { quote };
    else if (/available-slots$/.test(url.pathname)) {
      const ask = req.postDataJSON(), days = {};
      for (let d = new Date(ask.start_date + 'T12:00:00Z'); d <= new Date(ask.end_date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
        days[d.toISOString().slice(0, 10)] = { slots: ['10:00', '10:30'] };
      }
      body = { days };
    } else if (/create-booking$/.test(url.pathname)) {
      const payload = req.postDataJSON(); calls.push(payload);
      const fixture = bookingFixture({ consentBreak: BREAK });
      const outcome = await fixture.book(payload);
      if (outcome.status !== 200) throw Error('Local handler: ' + JSON.stringify(outcome));
      const customer = fixture.rows.customers.find(r => r.business_id === 'tenant-a');
      check('browser handler writes consent only when checked', payload.sms_consent === true ? customer?.sms_consent_source === 'booking_form' : !customer?.sms_consent_at);
      check('browser handler leaves other tenant alone', !fixture.rows.customers.find(r => r.business_id === 'tenant-b').sms_consent_at);
      check('browser handler takes email path', fixture.sends.length === 1);
      body = outcome.data;
    } else if (/functions\/v1\/(track-visit|weather)/.test(url.pathname)) body = {};
    else { escaped.push(url.pathname); return route.fulfill({ status: 200, headers, body: '{}' }); }
    return route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
  return { calls, escaped };
}
async function details(page, q = '') {
  await page.goto(BASE + '/book/consent-proof' + q, { waitUntil: 'networkidle' });
  await page.locator('.bk-card.selectable').first().click();
  for (let guard = 0; guard < 8; guard++) {
    if (await page.locator('input[type=tel]').count()) return;
    if (await page.locator('input[inputmode=numeric][maxlength="4"]').count()) await page.locator('input[inputmode=numeric][maxlength="4"]').fill('2020');
    if (await page.locator('.bk-cal').count()) {
      await page.locator('.bk-cal .cell:not(.closed):not(.empty)').last().click();
      await page.locator('.bk-slots .bk-chip').first().click();
    }
    await page.locator('.bk-bar .bk-btn.primary').click();
    await page.waitForTimeout(350);
  }
  throw Error('Details step never reached');
}
async function photograph(page, tag) {
  const file = `.manager-shots/99.2f/${tag}.jpg`;
  mkdirSync('.manager-shots/99.2f', { recursive: true });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, animations: 'disabled' }); artifacts.push(file);
}

const browser = await chromium.launch();
try {
  const VIEWS = SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : [[390,844,''], [1440,900,''], [768,1024,''], [392,844,''], [320,844,''], [390,844,'?lite=1']];
  for (const [width,height,q] of VIEWS) for (const lang of (BEFORE ? ['en'] : ['en','es'])) for (const choice of (BEFORE ? ['unchecked'] : ['unchecked','checked','uncheck'])) {
    const tag = `${lang}-${width}${q ? '-lite' : ''}-${choice}`, ctx = await browser.newContext({ viewport: { width,height } });
    await ctx.addInitScript(lang => localStorage.setItem('dp.lang',lang),lang);
    const page = await ctx.newPage(), logs = [];
    page.on('console', m => ['error','warning'].includes(m.type()) && logs.push(m.text()));
    page.on('pageerror', e => logs.push(e.message));
    const network = await routes(page);
    try {
      // One navigation per context, including sabotage (gotcha 113).
      await details(page,q); discovered++; attempted++;
      await page.locator('input[type=tel]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.evaluate(() => document.fonts.ready);
      if (BEFORE) {
        await freeze(page, { out: OUT + '/before.html', label: 'Before', note: 'Phone has no choice for appointment texts.', highlight: '.bk-grid2' });
        continue;
      }
      const box = page.locator('input[name=sms_consent]');
      check(`${tag} one checkbox`, await box.count() === 1);
      check(`${tag} unticked`, !await box.isChecked());
      check(`${tag} exact words`, await page.locator('.bk-sms-consent label').textContent() === (lang === 'en' ? WORDS : ES));
      check(`${tag} optional`, !await box.getAttribute('required'));
      check(`${tag} links`, await page.locator('.bk-sms-consent a[href="https://detailingplatform.com/privacy"]').count() === 1 && await page.locator('.bk-sms-consent a[href="https://detailingplatform.com/terms"]').count() === 1);
      check(`${tag} phone then consent then email`, await page.evaluate(() => {
        const phone = document.querySelector('input[type=tel]'), consent = document.querySelector('.bk-sms-consent'), email = document.querySelector('input[type=email]');
        return !!(phone.compareDocumentPosition(consent) & 4) && !!(consent.compareDocumentPosition(email) & 4);
      }));
      check(`${tag} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const layout = await page.locator('.bk-sms-consent').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { fits: r.left >= 0 && r.right <= innerWidth, text: getComputedStyle(el).color,
          links: [...el.querySelectorAll('a')].map(a => Math.min(a.getBoundingClientRect().height,a.getBoundingClientRect().width)), label: el.querySelector('label').getBoundingClientRect().height };
      });
      check(`${tag} consent and targets fit`, layout.fits && layout.label >= 44 && layout.links.every(h => h >= 44), JSON.stringify(layout));
      await photograph(page, 'details-' + tag);
      if (width === 390 && lang === 'en' && !q && !BREAK && choice === 'unchecked') {
        await freeze(page, { out: OUT + '/after.html', label: 'After', note: 'Appointment texts are optional. The box starts unticked, with Privacy and Terms beside it.', highlight: '.bk-sms-consent' });
      }
      // Both paths on every view: unchecked, checked, then unchecked again.
      if (choice !== 'unchecked') {
        await box.focus(); await page.keyboard.press('Space');
        check(`${tag} keyboard checks it`, await box.isChecked());
        if (choice === 'uncheck') await box.uncheck();
      }
      const expect = choice === 'checked';
      if (choice === 'unchecked') {
        await page.locator('.bk-bar .bk-btn.primary').click({force:true});
        check(`${tag} incomplete booking refused`, network.calls.length === 0 && await page.locator('input[type=tel]').count() === 1);
      }
      await page.getByLabel(lang === 'en' ? 'Your name' : 'Tu nombre', { exact: true }).fill('Maria Lopez');
      await page.locator('input[type=tel]').fill('555-0123');
      await page.locator('input[type=email]').fill('maria@example.invalid');
      await page.locator('.bk-bar .bk-btn.primary').click();
      await page.waitForTimeout(450);
      await page.locator('.bk-bar .bk-btn.primary').click();
      await page.locator('.bk-header .tagline').filter({ hasText: lang === 'en' ? 'Booking confirmed' : 'Reserva confirmada' }).waitFor({ timeout: 5000 });
      check(`${tag} booking completes`, network.calls.length === 1);
      check(`${tag} payload choice`, network.calls[0]?.sms_consent === expect, JSON.stringify({ choice, actual: network.calls[0]?.sms_consent }));
      check(`${tag} no consent remembered`, !JSON.parse(await page.evaluate(() => localStorage.getItem('bk.customer')) || '{}').smsConsent);
      check(`${tag} no unexpected external endpoint`, network.escaped.length === 0, network.escaped.join(','));
      check(`${tag} console silent`, logs.length === 0, logs.join(' | '));
      if (BREAK === 'default') check(`${tag} sabotage executed`, await page.evaluate(() => window.__consentBreak === true));
      seen.push({ tag, choice, calls: network.calls.length, console: logs }); completed++; console.log('Reached ' + tag);
    } catch(e) { failures.push(`${tag}: ${e.message.split('\n')[0]}`); }
    finally { await ctx.close(); }
  }
  for (const [width,height,q] of (SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : [[390,844,''], [1440,900,''], [768,1024,''], [392,844,''], [320,844,''], [390,844,'?lite=1']])) {
    const ctx = await browser.newContext({ viewport: { width,height } }), page = await ctx.newPage(), logs = [];
    await routes(page); page.on('console',m => ['error','warning'].includes(m.type()) && logs.push(m.text())); page.on('pageerror',e => logs.push(e.message));
    try {
      await page.goto(BASE + '/privacy' + q, { waitUntil: 'networkidle' });
      const row = BEFORE ? page.locator('.legalrow').filter({ hasText: 'What we hold about your customers' }) : page.locator('.legalrow').filter({ hasText: /^Text messages/ });
      await row.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
      if (BEFORE) { await freeze(page, { out: OUT + '/before-privacy.html', label: 'Before', note: 'The privacy page says nothing about appointment texts or mobile information.', highlightText: 'What we hold about your customers' }); continue; }
      discovered++; attempted++;
      const text = await row.textContent();
      check(`privacy-${width}${q} paragraph`, text.includes('Mobile information is not sold or shared with third parties for marketing or promotional purposes.'));
      check(`privacy-${width}${q} optional and pending`, text.includes('optional') && text.includes('not switched on yet'));
      check(`privacy-${width}${q} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`privacy-${width}${q} console silent`, logs.length === 0, logs.join(' | '));
      if (BREAK === 'privacy') check(`privacy-${width}${q} sabotage executed`, await page.evaluate(() => window.__privacyBreak === true));
      await photograph(page, `privacy-${width}${q ? '-lite' : ''}`);
      if (width === 390 && !q && !BREAK) await freeze(page, { out: OUT + '/after-privacy.html', label: 'After', note: 'The privacy page covers optional appointment texts and says mobile information is not sold or shared for marketing.', highlightText: 'Text messages' });
      completed++;
    } catch(e) { failures.push(`privacy-${width}${q}: ${e.message.split('\n')[0]}`); }
    finally { await ctx.close(); }
  }
  for (const [width,height,q] of (SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : [[390,844,''], [1440,900,''], [768,1024,''], [392,844,''], [320,844,''], [390,844,'?lite=1']])) {
    const ctx = await browser.newContext({viewport:{width,height}}), page = await ctx.newPage(), logs=[];
    await routes(page); page.on('console',m => ['error','warning'].includes(m.type()) && logs.push(m.text())); page.on('pageerror',e => logs.push(e.message));
    try {
      await page.goto(BASE + '/terms' + q,{waitUntil:'networkidle'});
      const date = page.locator('.legalnote').filter({hasText:'Effective'}); await date.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
      if (BEFORE) { await freeze(page,{out:OUT + '/before-terms.html',label:'Before',note:'The shared policy date predates the new texting paragraph.',highlightText:'Effective'}); continue; }
      discovered++; attempted++;
      check(`terms-${width}${q} date`,(await date.textContent()).includes('October 11, 2026'));
      check(`terms-${width}${q} clauses still present`,await page.locator('.legalrow').count() >= 11);
      check(`terms-${width}${q} no sideways scroll`,await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`terms-${width}${q} console silent`,logs.length === 0,logs.join(' | '));
      await photograph(page,`terms-${width}${q ? '-lite' : ''}`);
      if (width === 390 && !q && !BREAK) await freeze(page,{out:OUT + '/after-terms.html',label:'After',note:'The shared policy date now records the texting paragraph added on October 11.',highlightText:'Effective'});
      completed++;
    } catch(e) { failures.push(`terms-${width}${q}: ${e.message.split('\n')[0]}`); }
    finally { await ctx.close(); }
  }
  if (!BEFORE && !BREAK && !SERVER_ONLY) {
    const page = await browser.newPage();
    check('before/after booking differ', await differs(page, OUT + '/before.html', OUT + '/after.html'));
    check('before/after privacy differ', await differs(page, OUT + '/before-privacy.html', OUT + '/after-privacy.html'));
    check('before/after terms date differ', await differs(page, OUT + '/before-terms.html', OUT + '/after-terms.html'));
    await page.close();
    writeFileSync(OUT + '/where.json', JSON.stringify({ what: 'Optional appointment-text consent under Phone, and a texting paragraph on Privacy.', url: 'https://detailingplatform.com/book/consent-proof', how: 'Choose a service, vehicle, location and time, then open Your details. Privacy is linked beside the checkbox.', situation: 'A customer booking a full detail, before agreeing to any appointment texts. Local responses stand in for the database; no messages sent.' }, null, 2));
  }
} finally { await browser.close(); }
if (BEFORE) { if (failures.length) throw Error(failures.join('\n')); console.log('Before copies captured'); }
else {
  const old = { sms_consent_at:'2026-09-01T12:00:00.000Z',sms_consent_source:'reply_start' };
  const CASES = [
    ['absent', undefined, {}, false], ['false', false, {}, false], ['true', true, {}, true],
    ['string true', 'true', {}, false], ['string false', 'false', {}, false], ['number', 1, {}, false], ['null', null, {}, false],
    ['existing unchecked', false, {existing:old}, true], ['existing checked', true, {existing:old}, true],
    ['stopped checked', true, {existing:{sms_stopped_at:'2026-09-02T12:00:00Z'}}, true],
    ['member cannot claim booking consent', true, {member:{id:'owner'}}, false],
    ['slot refused', true, {refused:true}, false],
    ['duplicate retry', true, {duplicate:true,existing:{}}, true],
    ['insert collision retry', true, {collision:true,existing:{}}, true],
    ['consent write failure', true, {failedWrite:true}, false],
    ['forged source and timestamp ignored', false, {}, false],
  ];
  for (const [name,consent,opts,wanted] of CASES) {
    discovered++; attempted++;
    const f = bookingFixture({ ...opts,consentBreak:BREAK });
    const result = await f.book({ ...fixtureBooking,sms_consent:consent,sms_consent_at:'2020-01-01',sms_consent_source:'reply_start' });
    const customer = f.rows.customers.find(r => r.business_id === 'tenant-a');
    check(`${name} status`, result.status === (opts.refused ? 409 : opts.failedWrite ? 500 : 200), JSON.stringify(result));
    check(`${name} saved choice`, !!customer?.sms_consent_at === wanted, JSON.stringify(customer));
    check(`${name} other tenant unchanged`, !f.rows.customers.find(r => r.business_id === 'tenant-b').sms_consent_at);
    check(`${name} STOP preserved`, customer?.sms_stopped_at === (opts.existing?.sms_stopped_at ?? (customer ? null : undefined)));
    if (wanted) {
      check(`${name} source is server-owned`, customer?.sms_consent_source === (opts.existing?.sms_consent_source || 'booking_form'), JSON.stringify(customer));
      check(`${name} timestamp is server-owned`, opts.existing?.sms_consent_at ? customer.sms_consent_at === old.sms_consent_at : Math.abs(Date.now() - Date.parse(customer.sms_consent_at)) < 10000);
    }
    if (opts.refused) check(`${name} no rows written`, f.operations.every(o => o.operation === 'read'));
    if (opts.failedWrite) check(`${name} failure surfaced`, f.errors.some(e => e.includes('Consent write refused')));
    if (opts.duplicate || opts.collision) check(`${name} one booking`, f.rows.bookings.length === 1 && f.sends.length === 0);
    completed++;
  }
  for (const [name,test] of [
    ['fresh consent despite remembered customer', () => initialForm(profile.settings,{name:'Maria',phone:'555',smsConsent:true}).smsConsent === false],
    ['split bookings carry same explicit choice', () => {
      const form = { ...initialForm(profile.settings),customerName:'Maria',customerPhone:'555',customerEmail:'m@example.invalid',smsConsent:true,splitDays:true,extraVehicles:[{size:'small',date:'2026-11-01',time:'10:00'}] };
      const payloads = bookingRequests(form); return payloads.length === 2 && payloads.every(p => p.sms_consent === true);
    }],
    ['payload refuses truthy nonboolean', () => bookingRequests({...initialForm(profile.settings),smsConsent:'true'})[0].sms_consent === false],
    ['helper refuses customer from other tenant', async () => {
      const f = bookingFixture({consentBreak:BREAK}); await f.save('tenant-a',null,true,null);
      // Exercise the real helper against this fixture's scoped update.
      await f.save('tenant-a','customer-b',true,null);
      return f.rows.customers.every(r => !r.sms_consent_at);
    }],
  ]) {
    discovered++; attempted++;
    try { check(name, await test()); completed++; } catch(e) { failures.push(name + ': ' + e.message); }
  }
  // An always-run, actually broken production helper certifies the strict
  // choice assertion. The assertions themselves are identical in sabotage runs.
  const canary = bookingFixture({consentBreak:'strict'});
  await canary.book({...fixtureBooking,sms_consent:'true'});
  const canaryCaught = !!canary.rows.customers.find(r => r.business_id === 'tenant-a')?.sms_consent_at;
  check('canary truthy consent is detected',canaryCaught);
  const expected = SERVER_ONLY ? 20 : 68;
  const r = writeReceipt({ check_id: BREAK ? `booking-consent-${BREAK}` : 'booking-consent', started_at, status: failures.length ? 'fail' : 'pass',
    expected_targets: expected, discovered_targets: discovered, attempted_targets: attempted, completed_targets: completed, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: SERVER_ONLY ? 75 : 650, failures, artifacts, dimensions: { break: BREAK, server_only: SERVER_ONLY, seen, scope: 'Browser requests execute real local create-booking and consent helper against an in-memory database. Imported pricing, slot and email dependencies are stand-ins; no live booking or real send.' },
    canary: { id: 'real helper broken to accept string true creates consent that the strict-choice assertion rejects', observed_failure: canaryCaught }, warnings: ['Live delivery and deployed consent saving are not measured.'] });
  console.log(`${discovered} of ${expected} discovered; ${completed} completed; ${assertions} assertions; ${failures.length} failures. ${r.path}`);
  failures.forEach(f => console.error('FAIL ' + f)); if (failures.length) process.exitCode = 1;
}
