// 99.2f: actual public booking flow with EVERY external request intercepted.
// No login, database, provider or real sends. --capture=before precedes edits.
import { chromium } from '../app/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { freeze, differs } from '../../belt/freeze.mjs';
import { writeReceipt } from './receipt.mjs';
import { initialForm, bookingRequests } from '../app/src/book/core.js';
import { bookingFixture, fixtureBooking } from './lib/bookingConsentFixture.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:5182';
const OUT = 'C:/Users/rando/Downloads/claude/belt/shots/99.2';
const BEFORE = process.argv.includes('--capture=before');
const SERVER_ONLY = process.argv.includes('--server-only');
// 99.2's review pair lives outside the repo and is cleared once reviewed; with
// no Before there is nothing to pair an After with, so say so and skip it.
const REVIEW = !BEFORE && existsSync(OUT + '/before.html');
const BREAK = process.argv.find(a => a.startsWith('--break='))?.slice(8) || '';
if (BREAK && !['default', 'save', 'strict', 'privacy', 'half'].includes(BREAK)) throw Error('Unknown break');
const WORDS = 'Text me about my appointment. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';
const ES = 'Envíame mensajes de texto sobre mi cita. La frecuencia de los mensajes varía. Pueden aplicarse tarifas de mensajes y datos. Responde STOP para dejar de recibir mensajes o HELP para obtener ayuda.';
const fontCache = new Map();
// 99.5: 844x390 is a phone turned sideways. Phone heights are 99.5's
// before-run (e7749485^), so "no taller than today" is a measured ceiling.
const ALL_VIEWS = [[390,844,''], [1440,900,''], [768,1024,''], [392,844,''], [320,844,''], [390,844,'?lite=1'], [844,390,'']];
const PHONE_HEIGHT = { 390: { en: 119, es: 138 }, 320: { en: 138, es: 158 } };
const profile = {
  business: { id: 'tenant-a', slug: 'consent-proof', name: "Andrew's Auto Detail", timezone: 'America/Los_Angeles', phone: '555-0100', address: '1234 Oak St' },
  branding: {}, settings: { mobile_enabled: false, dropoff_enabled: true, ask_vehicle_condition: false,
    ask_water_electric: false, water_requirement: 'not_needed', power_requirement: 'not_needed', booking_mode: 'reserve',
    cancellation_window_hours: 24, max_vehicles_per_booking: 1 },
  services: [{ id: 'service-a', name: 'Full detail', price: 185, duration_minutes: 60, is_active: true, sort_order: 0 }],
  add_ons: [], plans: [], service_groups: [], hours: [],
};
const quote = { subtotal: 185, subtotal_before_discounts: 185, total: 185, total_duration: 60,
  single_vehicle_duration: 60, vehicle_count: 1, adjustments: [], services: [{ id: 'service-a', name: 'Full detail', price: 185, duration_minutes: 60 }], add_ons: [] };
const started_at = new Date().toISOString(), failures = [], artifacts = [], seen = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
function check(name, ok, detail = '') { assertions++; if (!ok) failures.push(`${name}: ${detail}`); }
async function routes(page, {failFirst = false} = {}) {
  const calls = [], escaped = [];
  const fixture = bookingFixture({consentBreak:BREAK,failedWrite:failFirst});
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
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
      // Reuse the real font bytes between isolated contexts. Each page still
      // loads the product fonts; repeated remote font requests add no proof.
      if (!fontCache.has(req.url())) {
        const response = await route.fetch();
        if (!response.ok()) throw Error('Product font request failed');
        fontCache.set(req.url(), { body:await response.body(),contentType:response.headers()['content-type'] });
      }
      return route.fulfill({status:200,...fontCache.get(req.url()),headers:{'access-control-allow-origin':'*'}});
    }
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
      const outcome = await fixture.book(payload);
      if (outcome.status === 500 && failFirst && calls.length === 1) {
        check('failed consent has a safe error',outcome.data.error === 'sms_consent_not_saved');
        check('failed consent kept one booking and one confirmation',fixture.rows.bookings.length === 1 && fixture.sends.length === 1);
        fixture.failWrites(false);
        return route.fulfill({status:500,headers,body:JSON.stringify(outcome.data)});
      }
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
  return { calls, escaped, fixture };
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
  const file = `.manager-shots/99.2f/${tag}${BREAK ? '-break-' + BREAK : ''}.jpg`;
  mkdirSync('.manager-shots/99.2f', { recursive: true });
  await page.screenshot({ path: file, type: 'jpeg', quality: 90, animations: 'disabled' }); artifacts.push(file);
}

const browser = await chromium.launch();
try {
  const VIEWS = SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : ALL_VIEWS;
  for (const [width,height,q] of VIEWS) for (const lang of (BEFORE ? ['en'] : ['en','es'])) for (const choice of (BEFORE ? ['unchecked'] : ['unchecked','checked','uncheck'])) {
    const tag = `${lang}-${width}${q ? '-lite' : ''}-${choice}`, ctx = await browser.newContext({ viewport: { width,height } });
    await ctx.addInitScript(lang => localStorage.setItem('dp.lang',lang),lang);
    const page = await ctx.newPage(), logs = [];
    page.on('console', m => ['error','warning'].includes(m.type()) && logs.push(m.text()));
    page.on('pageerror', e => logs.push(e.message));
    const failFirst = !BEFORE && choice === 'checked' && [1440,392].includes(width);
    const network = await routes(page,{failFirst});
    try {
      // One navigation per context, including sabotage (gotcha 113).
      await details(page,q); discovered++; attempted++;
      await page.locator('input[type=tel]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.evaluate(() => document.fonts.ready);
      if (BREAK === 'half') {
        // The pre-99.5 defect: the box back in the Phone column, links below.
        await page.addStyleTag({ content: '.bk-contact > .bk-sms-consent { grid-column: 1 !important; display: block !important; } .bk-contact .bk-sms-links { padding-left: calc(22px + var(--bk-sp-3)) !important; }' });
        check(`${tag} sabotage executed`, await page.evaluate(() => innerWidth <= 400 || getComputedStyle(document.querySelector('.bk-sms-consent')).display === 'block'));
      }
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
      // 99.5: whole form width and at most 2 lines (3 in Spanish) once Phone
      // and Email sit side by side; no taller than today on a phone.
      const fit = await page.evaluate(() => {
        const c = document.querySelector('.bk-sms-consent'), s = c.querySelector('label span'), r = c.getBoundingClientRect(), sr = s.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(s).lineHeight), links = [...c.querySelectorAll('a')].map(a => a.getBoundingClientRect());
        const above = Math.max(...['input[type=tel]', 'input[type=email]'].map(q => document.querySelector(q).getBoundingClientRect()).filter(b => b.left < r.right && b.top < r.top).map(b => b.bottom));
        return { width: Math.round(r.width), form: Math.round(document.querySelector('input[autocomplete=name]').getBoundingClientRect().width), height: Math.round(r.height),
          lines: Math.round(sr.height / lh) + (links.every(l => l.top < sr.bottom) ? 0 : 1), gapAbove: Math.round(r.top - above),
          linkGap: Math.round(Math.max(links[1].left - links[0].right, links[1].top - links[0].bottom)), sentenceClear: links.every(l => l.left >= sr.right || l.top >= sr.bottom) };
      });
      if (width > 400) {
        check(`${tag} consent spans the form`, Math.abs(fit.width - fit.form) <= 1, JSON.stringify(fit));
        check(`${tag} consent lines`, fit.lines <= (lang === 'en' ? 2 : 3), JSON.stringify(fit));
      } else if (PHONE_HEIGHT[width]) check(`${tag} consent no taller than before`, fit.height <= PHONE_HEIGHT[width][lang], JSON.stringify(fit));
      check(`${tag} consent is its own block`, fit.gapAbove >= 8 && fit.sentenceClear && fit.linkGap >= 8, JSON.stringify(fit));
      check(`${tag} consent and targets fit`, layout.fits && layout.label >= 44 && layout.links.every(h => h >= 44), JSON.stringify(layout));
      if (REVIEW && width === 390 && lang === 'en' && !q && !BREAK && choice === 'unchecked') {
        await freeze(page, { out: OUT + '/after.html', label: 'After', note: 'Appointment texts are optional. The box starts unticked, with Privacy and Terms beside it.', highlight: '.bk-sms-consent' });
      }
      // Both paths on every view: unchecked, checked, then unchecked again.
      // The initial-state assertion above catches an opt-in default. Reset
      // AFTER asking it so a broken default cannot prevent later scenarios
      // from reaching their own assertion (notably the save-error retry).
      await box.uncheck();
      if (choice !== 'unchecked') {
        await box.focus(); await page.keyboard.press('Space');
        check(`${tag} keyboard checks it`, await box.isChecked());
        if (choice === 'uncheck') await box.uncheck();
      }
      // 99.11: shoot AFTER the choice is set, so each state file shows its state.
      await photograph(page, 'details-' + tag);
      const expect = choice === 'checked';
      if (choice === 'unchecked') {
        await page.locator('.bk-bar .bk-btn.primary').click({force:true});
        check(`${tag} incomplete booking refused`, network.calls.length === 0 && await page.locator('input[type=tel]').count() === 1);
      }
      await page.getByLabel(lang === 'en' ? 'Your name' : 'Tu nombre', { exact: true }).fill('Maria Lopez');
      await page.locator('input[type=tel]').fill('555-012-3456');
      await page.locator('input[type=email]').fill('maria@example.invalid');
      await page.locator('.bk-bar .bk-btn.primary').click();
      await page.waitForTimeout(450);
      await page.locator('.bk-bar .bk-btn.primary').click();
      if (failFirst) {
        const message = lang === 'en' ? "Your booking is saved, but we couldn't save your text choice. Try again to save it." : 'Tu reserva está guardada, pero no pudimos guardar tu elección de mensajes de texto. Inténtalo de nuevo para guardarla.';
        await page.locator('.bk-error').filter({hasText:message}).waitFor();
        check(`${tag} refusal says booking saved and offers retry`,(await page.locator('.bk-error').textContent()) === message);
        await page.locator('.bk-error').scrollIntoViewIfNeeded(); await photograph(page,'save-failed-' + tag);
        await page.locator('.bk-bar .bk-btn.primary').click();
      }
      await page.locator('.bk-header .tagline').filter({ hasText: lang === 'en' ? 'Booking confirmed' : 'Reserva confirmada' }).waitFor({ timeout: 5000 });
      check(`${tag} booking completes`, network.calls.length === (failFirst ? 2 : 1));
      check(`${tag} one booking and one confirmation`,network.fixture.rows.bookings.length === 1 && network.fixture.sends.length === 1);
      check(`${tag} payload choice`, network.calls[0]?.sms_consent === expect, JSON.stringify({ choice, actual: network.calls[0]?.sms_consent }));
      check(`${tag} no consent remembered`, !JSON.parse(await page.evaluate(() => localStorage.getItem('bk.customer')) || '{}').smsConsent);
      check(`${tag} no unexpected external endpoint`, network.escaped.length === 0, network.escaped.join(','));
      const expectedErrors = logs.filter(l => /Failed to load resource.*500/.test(l));
      check(`${tag} console has only expected refusal`, logs.length === (failFirst ? 1 : 0) && expectedErrors.length === (failFirst ? 1 : 0), logs.join(' | '));
      if (BREAK === 'default') check(`${tag} sabotage executed`, await page.evaluate(() => window.__consentBreak === true));
      seen.push({ tag, choice, calls: network.calls.length, console: logs }); completed++; console.log('Reached ' + tag);
    } catch(e) { const message = `${tag}: ${e.message.split('\n')[0]}`; failures.push(message); console.error('FAIL ' + message); }
    finally { await ctx.close(); }
  }
  for (const [width,height,q] of (SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : ALL_VIEWS)) {
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
      if (REVIEW && width === 390 && !q && !BREAK) await freeze(page, { out: OUT + '/after-privacy.html', label: 'After', note: 'The privacy page covers optional appointment texts and says mobile information is not sold or shared for marketing.', highlightText: 'Text messages' });
      completed++;
    } catch(e) { failures.push(`privacy-${width}${q}: ${e.message.split('\n')[0]}`); }
    finally { await ctx.close(); }
  }
  for (const [width,height,q] of (SERVER_ONLY ? [] : BEFORE ? [[390,844,'']] : ALL_VIEWS)) {
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
      if (REVIEW && width === 390 && !q && !BREAK) await freeze(page,{out:OUT + '/after-terms.html',label:'After',note:'The shared policy date now records the texting paragraph added on October 11.',highlightText:'Effective'});
      completed++;
    } catch(e) { failures.push(`terms-${width}${q}: ${e.message.split('\n')[0]}`); }
    finally { await ctx.close(); }
  }
  if (!REVIEW && !BEFORE && !BREAK && !SERVER_ONLY) console.log('SKIPPED 99.2 before/after review copies: ' + OUT + '/before.html is gone (cleared after review).');
  if (REVIEW && !BREAK && !SERVER_ONLY) {
    const page = await browser.newPage();
    check('before/after booking differ', await differs(page, OUT + '/before.html', OUT + '/after.html'));
    check('before/after privacy differ', await differs(page, OUT + '/before-privacy.html', OUT + '/after-privacy.html'));
    check('before/after terms date differ', await differs(page, OUT + '/before-terms.html', OUT + '/after-terms.html'));
    await page.close();
    writeFileSync(OUT + '/where.json', JSON.stringify({ what: 'Optional appointment-text consent under Phone, and a texting paragraph on Privacy.', url: BASE + '/book/consent-proof', how: 'Choose a service, vehicle, location and time, then open Your details. Privacy is linked beside the checkbox.', situation: 'A customer booking a full detail, before agreeing to any appointment texts. Local responses stand in for the database; no messages sent.' }, null, 2));
  }
} finally { await browser.close(); }
if (BEFORE) { if (failures.length) throw Error(failures.join('\n')); console.log('Before copies captured'); }
else {
  const old = { sms_consent_at:'2026-09-01T12:00:00.000Z',sms_consent_source:'reply_start' };
  const serverEvidence = [];
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
    serverEvidence.push({name,status:result.status,savedConsent:!!customer?.sms_consent_at,source:customer?.sms_consent_source ?? null,
      stopPreserved:customer?.sms_stopped_at ?? null,bookings:f.rows.bookings.length,confirmationCalls:f.sends.length,
      otherTenantConsent:!!f.rows.customers.find(r => r.business_id === 'tenant-b').sms_consent_at});
    check(`${name} status`, result.status === (opts.refused ? 409 : opts.failedWrite ? 500 : 200), JSON.stringify(result));
    check(`${name} saved choice`, !!customer?.sms_consent_at === wanted, JSON.stringify(customer));
    check(`${name} other tenant unchanged`, !f.rows.customers.find(r => r.business_id === 'tenant-b').sms_consent_at);
    check(`${name} STOP preserved`, customer?.sms_stopped_at === (opts.existing?.sms_stopped_at ?? (customer ? null : undefined)));
    if (wanted) {
      check(`${name} source is server-owned`, customer?.sms_consent_source === (opts.existing?.sms_consent_source || 'booking_form'), JSON.stringify(customer));
      check(`${name} timestamp is server-owned`, opts.existing?.sms_consent_at ? customer.sms_consent_at === old.sms_consent_at : Math.abs(Date.now() - Date.parse(customer.sms_consent_at)) < 10000);
    }
    if (opts.refused) check(`${name} no rows written`, f.operations.every(o => o.operation === 'read'));
    if (opts.failedWrite) {
      check(`${name} failure surfaced safely`, result.data.error === 'sms_consent_not_saved' && f.helperErrors.some(e => e.includes('Consent write refused')));
      check(`${name} confirmation still sent`,f.sends.length === 1);
    }
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
      const f = bookingFixture({consentBreak:BREAK});
      let refused = false; try { await f.save('tenant-a',null,true,null); } catch(e) { refused = e.message === 'sms_consent_not_saved'; }
      // Exercise the real helper against this fixture's scoped update.
      await f.save('tenant-a','customer-b',true,null);
      return refused && f.rows.customers.every(r => !r.sms_consent_at);
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
  mkdirSync('.manager-shots/99.2f',{recursive:true});
  const serverArtifact = `.manager-shots/99.2f/server-${BREAK || 'clean'}.json`;
  writeFileSync(serverArtifact,JSON.stringify({scope:'Real handler and helper; database and delivery are in-memory stand-ins.',break:BREAK,cases:serverEvidence,canaryCaught},null,2));
  artifacts.push(serverArtifact);
  const expected = SERVER_ONLY ? 20 : 76;
  const r = writeReceipt({ check_id: BREAK ? `booking-consent-${BREAK}` : 'booking-consent', started_at, status: failures.length ? 'fail' : 'pass',
    expected_targets: expected, discovered_targets: discovered, attempted_targets: attempted, completed_targets: completed, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: SERVER_ONLY ? 75 : 650, failures, artifacts, dimensions: { break: BREAK, server_only: SERVER_ONLY, seen, scope: 'Browser requests execute real local create-booking and consent helper against an in-memory database. Imported pricing, slot and email dependencies are stand-ins; no live booking or real send.' },
    canary: { id: 'real helper broken to accept string true creates consent that the strict-choice assertion rejects', observed_failure: canaryCaught }, warnings: ['Live delivery and deployed consent saving are not measured.', ...(REVIEW || BREAK || SERVER_ONLY ? [] : ['99.2 before/after review copies skipped: belt/shots/99.2/before.html is gone.'])] });
  console.log(`${discovered} of ${expected} discovered; ${completed} completed; ${assertions} assertions; ${failures.length} failures. ${r.path}`);
  failures.forEach(f => console.error('FAIL ' + f)); if (failures.length) process.exitCode = 1;
}
