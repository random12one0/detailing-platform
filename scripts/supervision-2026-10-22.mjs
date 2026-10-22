// Local supervision of the merged legal pages. No env file, real login, API,
// database, email or paid call. Run from repo root. --break=old-words serves
// pre-fix legal.js; the ordinary disclosure assertion must fail.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { chromium } from '../app/node_modules/playwright/index.mjs';
import { createServer } from '../app/node_modules/vite/dist/node/index.js';
import react from '../app/node_modules/@vitejs/plugin-react/dist/index.js';

const broken = process.argv.includes('--break=old-words');
const proofOnly = process.argv.includes('--proof-only');
const out = `.manager-shots/supervision-2026-10-22-legal${proofOnly ? '-checker' : broken ? '-sabotage' : ''}`;
const expected = proofOnly ? 2 : 96;
mkdirSync(out, { recursive: true });
const root = path.resolve('app'), results = [];
const git_sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'ok' : 'FAIL'} ${name} ${ok ? '' : detail}`); };
const server = await createServer({ root, configFile: false, envFile: false, plugins: [{
  name: 'credential-free-legal-review', enforce: 'pre', load(id) {
    const file = path.resolve(id.split('?')[0]);
    if (!file.startsWith(path.join(root, 'src') + path.sep)) return null;
    let src = readFileSync(file, 'utf8');
    if (broken && file === path.join(root, 'src', 'landing', 'legal.js')) {
      src = execFileSync('git', ['show', 'ae1310bd:app/src/landing/legal.js'], { encoding: 'utf8' });
      if (src.includes('for 3 months')) throw new Error('pre-fix source still contains disclosure');
      src += '\n;window.__supervisionOldLegal = true;\n';
    }
    return src.replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify('http://127.0.0.1:9'))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', JSON.stringify('offline-placeholder'));
  }
}, react()], server: { host: 'localhost', port: 5173, strictPort: true }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  for (const [w, h] of proofOnly ? [] : [[390, 844], [1440, 900], [768, 1024], [392, 844]]) {
    for (const lite of ['', '?lite=1']) for (const route of ['/privacy', '/terms']) {
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      await context.route('**/*', r => {
        const u = new URL(r.request().url());
        return ['localhost', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname) ? r.continue() : r.abort();
      });
      const page = await context.newPage(), noise = [];
      page.on('console', m => { if (['error', 'warning'].includes(m.type())) noise.push(m.text()); });
      page.on('pageerror', e => noise.push(e.message));
      const at = `${route}${lite} ${w}`;
      try {
        await page.goto('http://localhost:5173' + route + lite);
        const subject = route === '/privacy' ? page.locator('.legalrow', { hasText: 'How long' }) : page.locator('.legalnote', { hasText: 'Effective' });
        await subject.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => getComputedStyle(el).opacity === '1', await subject.elementHandle());
        // Let ancestor reveal transitions finish before looking at painted pixels.
        await page.waitForTimeout(1200);
        const text = await subject.textContent();
        check(`${at}: intended content`, route === '/privacy'
          ? text.includes('for 30 days') && text.includes('for 3 months') && text.includes('Then it is deleted too.')
          : text.includes('October 21, 2026'), text);
        check(`${at}: surrounding text survives`, route !== '/privacy' || text.includes('When an account is closed and asks to be deleted, it is deleted.'));
        check(`${at}: correct source executed`, await page.evaluate(() => !!window.__supervisionOldLegal) === broken);
        check(`${at}: painted and inside screen`, await subject.evaluate(el => {
          const r = el.getBoundingClientRect();
          return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && r.left >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
        }));
        // Exercise the real navigation link, not a synthetic history change.
        const link = page.getByRole('link', { name: route === '/privacy' ? 'Terms' : 'Privacy', exact: true }).first();
        const href = await link.getAttribute('href');
        check(`${at}: opposite legal page linked`, href?.includes(route === '/privacy' ? '/terms' : '/privacy'));
        await page.screenshot({ path: `${out}/${route.slice(1)}-${w}${lite ? '-lite' : ''}.png` });
        await link.click();
        await page.waitForURL('**' + (route === '/privacy' ? '/terms' : '/privacy'));
        check(`${at}: link works and console clean`, noise.length === 0, noise.join('|'));
      } finally { await context.close(); }
    }
  }
  if (proofOnly) for (const sabotage of [false, true]) {
    const tag = sabotage ? 'old-words' : 'clean';
    const run = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/privacy-backup-period.mjs', '--base=http://localhost:5173',
        `--shots=${out}/${tag}`, ...(sabotage ? ['--break=old-words'] : [])], { windowsHide: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
      child.on('error', reject); child.on('close', code => resolve({ code, stdout, stderr }));
    });
    writeFileSync(`${out}/${tag}.txt`, JSON.stringify(run, null, 2) + '\n');
    check(`committed privacy checker ${tag}`, sabotage
      ? run.code === 1 && run.stdout.includes('FAIL 1440x900 · How long states') && run.stdout.includes('8 of 8 targets')
      : run.code === 0 && run.stdout.includes('48 of 48 passed'), run.stdout.slice(-650) + run.stderr);
  }
} catch (e) { check('all targets reached', false, e.stack); }
finally {
  await browser?.close(); await server.close();
  const receipt = { at: new Date().toISOString(), git_sha, local_only: true, break: broken ? 'pre-fix legal.js' : null,
    expected, discovered: results.length, results, limitations: ['No private backup installation or live database was checked.'] };
  writeFileSync(`${out}/result.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ expected, discovered: results.length, failed: results.filter(r => !r.ok).length, out }));
  process.exitCode = results.length !== expected || results.some(r => !r.ok) ? 1 : 0;
}
