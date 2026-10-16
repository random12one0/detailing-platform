// ROADMAP 97.64 — the public booking page, both sides of the duplicate answer,
// in a real browser. Every external request is intercepted: the create-booking
// call runs the REAL handler against the in-memory fixture
// (scripts/lib/bookingConsentFixture.mjs). No login, database or send.
//
//   GENUINE  — the customer presses Confirm, the booking is saved but the answer
//              is lost (a 502), they press Confirm again. Both presses must carry
//              the same booking_ref, the second is answered 200 duplicate with
//              the id, ONE booking exists, and the screen offers "Add to my
//              calendar" and the manage link for that id.
//   STRANGER — a second browser, same name, phone and time, presses Confirm
//              once. The answer must carry no id, and the screen must offer no
//              link to the booking.
//
//   node scripts/duplicate-retry-screen.mjs                  clean run, receipt
//   node scripts/duplicate-retry-screen.mjs --break=hand-back-id   the pre-97.64 server: stranger red
//   node scripts/duplicate-retry-screen.mjs --break=no-ref         a page that sends no ref: genuine red
//   node scripts/duplicate-retry-screen.mjs --capture=before       pre-97.64 server, review page only
import { chromium } from '../app/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { freeze, differs } from '../../belt/freeze.mjs';
import { writeReceipt } from './receipt.mjs';
import { bookingFixture } from './lib/bookingConsentFixture.mjs';

const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:5180';
const OUT = 'C:/Users/rando/Downloads/claude/belt/shots/97.64';
const BEFORE = process.argv.includes('--capture=before');
const BREAK = process.argv.find((a) => a.startsWith('--break='))?.slice(8) || '';
if (BREAK && !['hand-back-id', 'no-ref'].includes(BREAK)) throw Error('Unknown break');
const OLD_ID = [`return { booking: id === bookingRef(body) ? mine : rest, duplicate: true };`, `return { booking: mine, duplicate: true };`];
const VIEWS = BEFORE ? [[390, 844, '']] : [[390, 844, ''], [768, 1024, ''], [1440, 900, ''], [320, 844, ''], [390, 844, '?lite=1']];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERSON = { name: 'Maria Lopez', phone: '(555) 012-3456', email: 'maria@example.invalid' };
const profile = {
  business: { id: 'tenant-a', slug: 'consent-proof', name: "Andrew's Auto Detail", timezone: 'America/Los_Angeles', phone: '555-0100', address: '1234 Oak St' },
  branding: {}, settings: { mobile_enabled: false, dropoff_enabled: true, ask_vehicle_condition: false, ask_water_electric: false,
    water_requirement: 'not_needed', power_requirement: 'not_needed', booking_mode: 'reserve', cancellation_window_hours: 24, max_vehicles_per_booking: 1 },
  services: [{ id: 'service-a', name: 'Full detail', price: 185, duration_minutes: 60, is_active: true, sort_order: 0 }],
  add_ons: [], plans: [], service_groups: [], hours: [],
};
const quote = { subtotal: 185, subtotal_before_discounts: 185, total: 185, total_duration: 60, single_vehicle_duration: 60, vehicle_count: 1,
  adjustments: [], services: [{ id: 'service-a', name: 'Full detail', price: 185, duration_minutes: 60 }], add_ons: [] };
const started_at = new Date().toISOString(), failures = [], artifacts = [], seen = [];
let assertions = 0, discovered = 0, attempted = 0, completed = 0;
const check = (name, ok, detail = '') => { assertions++; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : ' — ' + detail}`); if (!ok) failures.push(`${name}: ${detail}`); };

// One fixture per view, shared by both browsers: the stranger asks about the
// booking the genuine customer made.
async function routes(page, fixture, { loseFirst }) {
  const calls = [], answers = [], escaped = [];
  await page.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === BASE) {
      // A belt copy's server has no app/.env.local; every Supabase request is
      // answered below, so a placeholder address is all the app needs.
      if (/\/src\/lib\/(api|supabase)\.js$/.test(url.pathname)) {
        const response = await route.fetch(), src = await response.text();
        if (!src.includes('"VITE_SUPABASE_URL":')) return route.fulfill({ response, body: src
          .replaceAll('import.meta.env.VITE_SUPABASE_URL', '"https://fixture.supabase.invalid"')
          .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', '"fixture-anon"') });
      }
      if (BREAK === 'no-ref' && /\/src\/book\/BookingPage\.jsx$/.test(url.pathname)) {
        const response = await route.fetch(), src = await response.text();
        const changed = src.replace('booking_ref: refs.current.refs[i]', 'booking_ref: undefined');
        if (changed === src) throw Error('no-ref sabotage did not land');
        return route.fulfill({ response, body: changed });
      }
      return route.continue();
    }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return route.fulfill({ status: 200, body: '' });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let body = {};
    if (/get_public_business_profile$/.test(url.pathname)) body = profile;
    else if (/get_business_translations$/.test(url.pathname)) body = {};
    else if (/calculate-booking$/.test(url.pathname)) body = { quote };
    else if (/available-slots$/.test(url.pathname)) {
      const ask = req.postDataJSON(), days = {};
      for (let d = new Date(ask.start_date + 'T12:00:00Z'); d <= new Date(ask.end_date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) days[d.toISOString().slice(0, 10)] = { slots: ['10:00', '10:30'] };
      body = { days };
    } else if (/create-booking$/.test(url.pathname)) {
      const payload = req.postDataJSON(); calls.push(payload);
      const outcome = await fixture.book(payload); answers.push(outcome);
      // The first press is SAVED and its answer lost on the way back.
      if (loseFirst && calls.length === 1) return route.fulfill({ status: 502, headers, body: JSON.stringify({ error: 'Network error. Please try again.' }) });
      return route.fulfill({ status: outcome.status, headers, body: JSON.stringify(outcome.data) });
    } else if (/functions\/v1\/(track-visit|weather)/.test(url.pathname)) body = {};
    else { escaped.push(url.pathname); return route.fulfill({ status: 200, headers, body: '{}' }); }
    return route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
  return { calls, answers, escaped };
}

async function book(page, q) {
  await page.goto(BASE + '/book/consent-proof' + q, { waitUntil: 'networkidle' });
  await page.locator('.bk-card.selectable').first().click();
  for (let guard = 0; guard < 8 && !(await page.locator('input[type=tel]').count()); guard++) {
    if (await page.locator('.bk-cal').count()) {
      await page.locator('.bk-cal .cell:not(.closed):not(.empty)').last().click();
      await page.locator('.bk-slots .bk-chip').first().click();
    }
    await page.locator('.bk-bar .bk-btn.primary').click();
    await page.waitForTimeout(350);
  }
  await page.getByLabel('Your name', { exact: true }).fill(PERSON.name);
  await page.locator('input[type=tel]').fill(PERSON.phone);
  await page.locator('input[type=email]').fill(PERSON.email);
  await page.locator('.bk-bar .bk-btn.primary').click();
  await page.waitForTimeout(450);
  await page.locator('.bk-bar .bk-btn.primary').click();
}
const confirmed = (page) => page.locator('.bk-header .tagline').filter({ hasText: 'Booking confirmed' }).waitFor({ timeout: 6000 });
const links = (page) => page.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => /booking|\.ics|calendar/i.test(h || '')));
async function shot(page, tag) {
  const file = `${OUT}/png/${tag}${BREAK ? '-break-' + BREAK : ''}.png`;
  mkdirSync(`${OUT}/png`, { recursive: true });
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' }); artifacts.push(file);
}
async function open(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => localStorage.setItem('dp.lang', 'en'));
  const page = await ctx.newPage(), logs = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(e.message));
  return { ctx, page, logs };
}
// The 502 is the scenario itself; anything else is a defect.
const unexpected = (logs) => logs.filter((l) => !/Failed to load resource.*502/.test(l));

const browser = await chromium.launch();
try {
  for (const [width, height, q] of VIEWS) {
    const tag = `${width}x${height}${q ? '-lite' : ''}`;
    const fixture = bookingFixture({ bookingId: 'server-made', srcPatch: BEFORE || BREAK === 'hand-back-id' ? [OLD_ID] : [] });
    console.log(`\n${tag}`);

    if (!BEFORE) {
      // GENUINE: saved, answer lost, pressed again.
      discovered++; attempted++;
      const { ctx, page, logs } = await open(browser, width, height);
      const net = await routes(page, fixture, { loseFirst: true });
      await book(page, q);
      await page.locator('.bk-error').waitFor({ timeout: 6000 });
      await page.locator('.bk-bar .bk-btn.primary').click();
      const ok = await confirmed(page).then(() => true, () => false);
      const [a, b] = net.calls, ref = a?.booking_ref, second = net.answers[1]?.data;
      check(`${tag} genuine · both presses carry the same booking_ref`, UUID.test(ref || '') && b?.booking_ref === ref, `${ref} / ${b?.booking_ref}`);
      check(`${tag} genuine · the retry answers 200 with duplicate: true and the id`, net.answers[1]?.status === 200 && second?.duplicate === true && second?.booking?.id === ref, JSON.stringify(net.answers[1]));
      check(`${tag} genuine · ONE booking exists, and its id is the ref`, fixture.rows.bookings.length === 1 && fixture.rows.bookings[0].id === ref, `${fixture.rows.bookings.length} rows, id ${fixture.rows.bookings[0]?.id}`);
      check(`${tag} genuine · the confirmation screen appears`, ok);
      const calendar = await page.getByRole('link', { name: 'Add to my calendar' }).getAttribute('href').catch(() => null);
      const manage = await page.getByRole('link', { name: 'View, change or cancel this booking' }).getAttribute('href').catch(() => null);
      check(`${tag} genuine · "Add to my calendar" opens this booking's file`, !!calendar && calendar.includes(ref), String(calendar));
      check(`${tag} genuine · the manage link opens this booking`, manage === `/booking/${ref}`, String(manage));
      check(`${tag} genuine · console clean`, unexpected(logs).length === 0, unexpected(logs).join(' | '));
      check(`${tag} genuine · no unexpected endpoint`, net.escaped.length === 0, net.escaped.join(','));
      seen.push({ view: tag, who: 'genuine', calls: net.calls.map((c) => c.booking_ref ?? null), retry_answer: second, calendar, manage });
      await shot(page, `genuine-${tag}`);
      if (!BREAK && tag === '390x844') await freeze(page, { out: `${OUT}/after-genuine.html`, label: 'After',
        note: 'The real customer whose first press was saved but whose answer was lost: pressing Confirm again still lands here, with Add to my calendar and the manage link.', highlightText: 'Add to my calendar' });
      await ctx.close(); completed++;
    } else {
      await fixture.book({ business_slug: 'consent-proof', customer_name: PERSON.name, customer_phone: PERSON.phone, customer_email: PERSON.email,
        service_type: 'dropoff', vehicle_size: 'small', service_ids: ['service-a'], booking_date: '2026-10-30', start_time: '10:00' });
    }

    // STRANGER: same name, phone and time, a different browser, one press.
    discovered++; attempted++;
    const { ctx, page, logs } = await open(browser, width, height);
    const net = await routes(page, fixture, { loseFirst: false });
    await book(page, q);
    const ok = await confirmed(page).then(() => true, () => false);
    const answer = net.answers[0]?.data, hrefs = await links(page);
    const victim = fixture.rows.bookings[0]?.id;
    if (BEFORE) {
      await freeze(page, { out: `${OUT}/before.html`, label: 'Before',
        note: 'A stranger who typed someone else\'s name, phone and appointment time: the page hands them "View, change or cancel this booking" for that person\'s real booking.', highlightText: 'View, change or cancel this booking' });
      await shot(page, `before-stranger-${tag}`);
      await ctx.close();
      continue;
    }
    check(`${tag} stranger · answered 200 duplicate, ONE booking still`, net.answers[0]?.status === 200 && answer?.duplicate === true && fixture.rows.bookings.length === 1, JSON.stringify(net.answers[0]));
    check(`${tag} stranger · the answer carries no booking id`, !('id' in (answer?.booking || {})), JSON.stringify(answer));
    check(`${tag} stranger · the answer's keys are exactly start_at, status`, JSON.stringify(Object.keys(answer?.booking || {}).sort()) === '["start_at","status"]', JSON.stringify(answer?.booking));
    check(`${tag} stranger · the screen appears`, ok);
    check(`${tag} stranger · no link on the page names the booking`, !hrefs.some((h) => h.includes(victim)) && !hrefs.some((h) => /undefined|null/.test(h)), hrefs.join(', '));
    check(`${tag} stranger · the screen says where the link is instead`, await page.getByText('The link to view, change or cancel it is in your confirmation email.').count() === 1);
    check(`${tag} stranger · console clean`, unexpected(logs).length === 0, unexpected(logs).join(' | '));
    seen.push({ view: tag, who: 'stranger', ref: net.calls[0]?.booking_ref ?? null, answer, hrefs });
    await shot(page, `stranger-${tag}`);
    if (!BREAK && tag === '390x844') {
      await freeze(page, { out: `${OUT}/after.html`, label: 'After',
        note: 'The same stranger: the page no longer gets the booking\'s link. It says the link is in the confirmation email, which went to the real customer.', highlightText: 'The link to view, change or cancel it is in your confirmation email.' });
      // A fresh page: the routed one answers file:// with the stub too.
      const plain = await browser.newPage();
      console.log('differs:', await differs(plain, `${OUT}/before.html`, `${OUT}/after.html`));
      await plain.close();
    }
    await ctx.close(); completed++;
  }
} finally { await browser.close(); }

if (!BEFORE) {
  console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${assertions} assertions, ${completed} of ${VIEWS.length * 2} scenarios.`);
  const { path } = writeReceipt({
    check_id: 'duplicate-retry-screen', started_at, status: failures.length ? 'fail' : 'pass',
    expected_targets: VIEWS.length * 2, discovered_targets: discovered, attempted_targets: attempted, completed_targets: completed, skipped_targets: 0,
    // 8 genuine + 7 stranger per view.
    assertions_executed: assertions, min_assertions: 15 * VIEWS.length, artifacts, failures,
    dimensions: { views: VIEWS.map((v) => v.join('')), seen, ...(BREAK ? { break: BREAK } : {}),
      scope: 'Real create-booking handler on an in-memory table; profile, quote and slots are stand-ins; no live booking or send.' },
    canary: { id: 'stranger-sees-no-link', observed_failure: null, note: 'Sabotage via --break=hand-back-id (server) and --break=no-ref (page).' },
  });
  console.log('receipt:', path);
  process.exit(failures.length ? 1 : 0);
}
