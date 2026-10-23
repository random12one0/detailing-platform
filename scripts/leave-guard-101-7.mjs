// ROADMAP 101.7 — How you get paid and the sale ask before an unsaved change is
// lost, and Remove / Disconnect ask once, in place.
//
// Local only: Vite in-process on its own port (never 5173) against the belt's
// in-memory demo backend. No database, email or paid service is touched; the
// Stripe answer is a Playwright stub of `connect-account`.
//
//   node scripts/leave-guard-101-7.mjs [--belt=<belt dir>] [--port=5191] [--unfixed]
//
// `--unfixed` serves the four screen files exactly as they were at 00e25319
// (before 101.7), and must FAIL. Screenshots and result.json go to
// `.manager-shots/101.7[-unfixed]/` (gitignored).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from '../app/node_modules/vite/dist/node/index.js';
import react from '../app/node_modules/@vitejs/plugin-react/dist/index.js';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').split('=').slice(1).join('=') || d;
const unfixed = process.argv.includes('--unfixed');
const BASE = '00e25319';
const OLD = ['components/SettingsHost.jsx', 'screens/more/Payments.jsx', 'screens/more/Promos.jsx', 'lib/strings/appEs.js'];
const port = Number(arg('port', 5191));
if (port === 5173) throw new Error('5173 belongs to another session');
const belt = path.resolve(arg('belt', path.resolve('..', 'belt')));
const { startDemoBackend } = await import(pathToFileURL(path.join(belt, 'demo-backend.mjs')).href);
const require = createRequire(new URL('../app/package.json', import.meta.url));
const { chromium } = require('playwright');

const out = arg('shots', `.manager-shots/101.7${unfixed ? '-unfixed' : ''}`);
mkdirSync(out, { recursive: true });
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const root = path.resolve('app'), results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };

const demo = await startDemoBackend({ port: 0, quiet: true });
const initial = structuredClone(demo.db.tables);
const session = await fetch(demo.url + '/auth/v1/token?grant_type=password', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@detailplatform.com' }),
}).then((r) => r.json());
const server = await createServer({ root, configFile: false, envFile: false, plugins: [{
  name: 'offline-101-7', enforce: 'pre', load(id) {
    const clean = path.resolve(id.split('?')[0]);
    if (!clean.startsWith(path.join(root, 'src') + path.sep)) return null;
    let s = readFileSync(clean, 'utf8');
    const rel = path.relative(path.join(root, 'src'), clean).split(path.sep).join('/');
    if (unfixed && OLD.includes(rel)) s = execFileSync('git', ['show', `${BASE}:app/src/${rel}`], { encoding: 'utf8' });
    return s.replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify(demo.url))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', JSON.stringify('offline-placeholder'));
  },
}, react()], server: { host: 'localhost', port, strictPort: true }, logLevel: 'error' });

const row = () => demo.db.tables.business_settings[0];
const CARD = { available: true, connected: true, chargesEnabled: true, cardPaymentsEnabled: false, accountHint: '4242', detail: 'Card payments are off. Switch them on when you want them.' };

let browser;
try {
  await server.listen(); browser = await chromium.launch();
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    demo.db.tables = structuredClone(initial);
    Object.assign(row(), { pay_venmo: null, site_discount_active: false, site_discount_percent: 0, site_discount_label: null });
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(({ s }) => { localStorage.setItem('sb-127-auth-token', JSON.stringify(s)); }, { s: session });
    await ctx.route('**/*', (r) => {
      const u = new URL(r.request().url());
      return ['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname) ? r.continue() : r.abort();
    });
    const page = await ctx.newPage(), noise = [], dialogs = [];
    let writes = 0, disconnects = 0;
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) noise.push(m.text()); });
    page.on('pageerror', (e) => noise.push(e.message));
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
    await page.route('**/rest/v1/business_settings?*', (r) => { if (r.request().method() === 'PATCH') writes++; return r.continue(); });
    await page.route('**/functions/v1/connect-account', async (r) => {
      const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hdr });
      const action = JSON.parse(r.request().postData() || '{}').action;
      if (action === 'disconnect') { disconnects++; return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ available: true, connected: false }) }); }
      return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify(CARD) });
    });

    const back = () => page.locator('.settings-head .btn.icon, aside.settings-col button.x').first().click();
    const isOpen = (title) => page.locator(`.settings-page h1:text-is("${title}"), aside.settings-col[aria-label="${title}"]`).count().then((n) => n > 0);
    const leaveBtn = () => page.getByRole('button', { name: 'Leave without saving', exact: true });
    const saveBackBtn = () => page.getByRole('button', { name: 'Save and go back', exact: true });
    const settle = () => page.waitForTimeout(700);
    const reopen = async (key, marker) => { await page.locator(`.nav-row[data-settings-key="${key}"]`).first().click(); await page.getByText(marker, { exact: true }).first().waitFor(); await settle(); };
    const home = async () => { await page.goto(`http://localhost:${port}/app`); await page.locator("nav").getByText("Business", { exact: true }).first().click(); };
    const tag = `${w}:`;
    try {
      // ---------------- How you get paid
      const PT = 'How you get paid', PM = 'Anything else you take';
      const saveBtn = () => page.locator('.settings-page, aside.settings-col').getByRole('button', { name: /^(Save|Save changes|Saved|Saving)$/ });
      await home(); await reopen("payments", PM);
      check(`${tag} payments opens with nothing unsaved: Save reads Saved, disabled`, (await saveBtn().textContent()) === 'Saved' && await saveBtn().isDisabled(), await saveBtn().textContent());
      await back(); await settle();
      check(`${tag} payments, nothing changed: back leaves without asking`, !(await isOpen(PT)) && (await leaveBtn().count()) === 0);

      await reopen('payments', PM);
      await page.getByText('Venmo', { exact: true }).first().click();
      await page.getByPlaceholder('your-handle', { exact: true }).fill('left-behind');
      check(`${tag} payments, typed handle: Save reads Save changes`, (await saveBtn().textContent()) === 'Save changes');
      await back(); await settle();
      check(`${tag} payments, unsaved + back: asks in place, screen stays`, (await leaveBtn().isVisible().catch(() => false)) && await saveBackBtn().isVisible().catch(() => false) && await isOpen(PT));
      await page.screenshot({ path: `${out}/payments-ask-${w}.png` });
      if (await leaveBtn().count()) { await leaveBtn().click(); await settle(); }
      check(`${tag} payments, Leave without saving: closes and writes nothing`, !(await isOpen(PT)) && writes === 0 && row().pay_venmo == null, `writes=${writes} venmo=${row().pay_venmo}`);
      if (!(await isOpen(PT))) await reopen('payments', PM);
      check(`${tag} payments, after leaving: the typed handle is gone`, (await page.getByPlaceholder('your-handle', { exact: true }).count()) === 0);

      await page.getByText('Venmo', { exact: true }).first().click();
      await page.getByPlaceholder('your-handle', { exact: true }).fill('kept-handle');
      await back(); await settle();
      if (await saveBackBtn().count()) { await saveBackBtn().click(); await settle(); }
      check(`${tag} payments, Save and go back: saves and closes`, !(await isOpen(PT)) && row().pay_venmo === 'kept-handle', `venmo=${row().pay_venmo}`);
      if (!(await isOpen(PT))) await reopen('payments', PM);
      check(`${tag} payments, reopened: handle kept, Save reads Saved`, (await page.getByPlaceholder('your-handle', { exact: true }).inputValue().catch(() => '')) === 'kept-handle' && (await saveBtn().textContent()) === 'Saved');

      // Remove asks once, in place.
      const customBefore = JSON.stringify(row().pay_custom ?? null);
      const remove = page.getByRole('button', { name: 'Remove', exact: true }).first();
      await remove.scrollIntoViewIfNeeded(); await remove.click();
      const q = page.getByText(/^Remove .+\? Customers stop seeing it once you save\.$/);
      const asked = await q.isVisible().catch(() => false);
      check(`${tag} Remove asks first, row still there`, asked && (await page.getByText('Something else', { exact: true }).count()) > 0 && dialogs.length === 0, `dialogs=${dialogs.length}`);
      await page.screenshot({ path: `${out}/payments-remove-${w}.png` });
      if (asked) {
        await page.getByRole('button', { name: 'Yes, remove it', exact: true }).click();
        await page.waitForTimeout(200);
      }
      check(`${tag} Remove confirmed: row gone, Save reads Save changes`, (await page.getByText('Something else', { exact: true }).count()) === 0 && (await saveBtn().textContent()) === 'Save changes');
      await back(); await settle();
      if (await leaveBtn().count()) { await leaveBtn().click(); await settle(); }
      check(`${tag} Remove then Leave without saving: nothing written`, JSON.stringify(row().pay_custom ?? null) === customBefore && writes === 1, `writes=${writes}`);

      // Disconnect asks once, in place — no browser dialog.
      if (!(await isOpen(PT))) await reopen('payments', PM);
      const disc = page.getByRole('button', { name: 'Disconnect Stripe', exact: true });
      await disc.scrollIntoViewIfNeeded(); await disc.click(); await page.waitForTimeout(300);
      const dq = page.getByText(/^Disconnect Stripe\? Your customers will not/);
      check(`${tag} Disconnect asks in place, nothing sent, no browser dialog`, (await dq.isVisible().catch(() => false)) && disconnects === 0 && dialogs.length === 0, `disconnects=${disconnects} dialogs=${dialogs.length}`);
      await page.screenshot({ path: `${out}/payments-disconnect-${w}.png` });
      if (await page.getByRole('button', { name: 'Yes, disconnect', exact: true }).count()) {
        await page.getByRole('button', { name: 'Yes, disconnect', exact: true }).click(); await page.waitForTimeout(500);
      }
      check(`${tag} Disconnect confirmed: one request`, disconnects === 1, `disconnects=${disconnects}`);

      // ---------------- The sale
      const ST = 'Promo codes & sale', SM = 'Sale is running';
      const saleBtn = () => page.locator('.settings-page, aside.settings-col').getByRole('button', { name: /^(Save sale|Saved)$/ });
      const w0 = writes;
      await home(); await reopen("promos", SM);
      check(`${tag} sale opens with nothing unsaved: Saved, disabled, filled`, (await saleBtn().textContent()) === 'Saved' && await saleBtn().isDisabled() && /\bprimary\b/.test(await saleBtn().getAttribute('class')));
      await back(); await settle();
      check(`${tag} sale, nothing changed: back leaves without asking`, !(await isOpen(ST)) && (await leaveBtn().count()) === 0);

      await reopen('promos', SM);
      await page.getByText(SM, { exact: true }).click();
      await page.getByRole('button', { name: '10%', exact: true }).first().click();
      check(`${tag} sale on at 10%: Save sale enabled`, (await saleBtn().textContent()) === 'Save sale' && await saleBtn().isEnabled());
      await back(); await settle();
      check(`${tag} sale, unsaved + back: asks in place, screen stays`, (await leaveBtn().isVisible().catch(() => false)) && await isOpen(ST));
      await page.screenshot({ path: `${out}/sale-ask-${w}.png` });
      if (await leaveBtn().count()) { await leaveBtn().click(); await settle(); }
      check(`${tag} sale, Leave without saving: closes, sale still off`, !(await isOpen(ST)) && writes === w0 && row().site_discount_active === false, `writes=${writes - w0}`);

      if (!(await isOpen(ST))) await reopen('promos', SM);
      await page.getByText(SM, { exact: true }).click();
      await page.getByRole('button', { name: '10%', exact: true }).first().click();
      await back(); await settle();
      if (await saveBackBtn().count()) { await saveBackBtn().click(); await settle(); }
      check(`${tag} sale, Save and go back: saved running at 10% and closed`, !(await isOpen(ST)) && row().site_discount_active === true && row().site_discount_percent === 10, `active=${row().site_discount_active} pct=${row().site_discount_percent}`);

      if (!(await isOpen(ST))) await reopen('promos', SM);
      await page.getByText(SM, { exact: true }).click();
      await page.getByText(SM, { exact: true }).click();
      await page.waitForTimeout(200);
      check(`${tag} sale switched off and on again: nothing unsaved`, (await saleBtn().textContent()) === 'Saved');
      await back(); await settle();
      check(`${tag} sale, flipped back: back leaves without asking`, !(await isOpen(ST)) && (await leaveBtn().count()) === 0);

      check(`${tag} no browser dialog anywhere`, dialogs.length === 0, dialogs.join('|'));
      check(`${tag} no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`${tag} console clean`, noise.length === 0, noise.join(' | ').slice(0, 600));
    } catch (e) {
      await page.screenshot({ path: `${out}/interrupted-${w}.png` }).catch(() => {});
      check(`${tag} walk completed`, false, e.message.split('\n')[0]);
    } finally { await ctx.close(); }
  }
} catch (e) { check('walk started', false, e.stack); }
finally {
  await browser?.close(); await server.close(); await demo.close();
  const expected = 48;
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(`${out}/result.json`, JSON.stringify({ at: new Date().toISOString(), git_sha: sha, unfixed, expected, discovered: results.length, failed, results,
    limitations: ['in-memory backend and a stubbed connect-account; no live RLS, deployment or Stripe call proved'] }, null, 2));
  console.log(JSON.stringify({ expected, discovered: results.length, failed, out }));
  process.exitCode = results.length !== expected || failed ? 1 : 0;
}
