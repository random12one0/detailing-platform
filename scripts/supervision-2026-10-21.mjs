// Local supervision only. Serves the exact held branch sources through Vite,
// using main's installed dependencies. Never reads an env file or calls a live API.
// node scripts/supervision-2026-10-21.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import { createServer, transformWithEsbuild } from '../app/node_modules/vite/dist/node/index.js';
import { startDemoBackend } from '../../belt/demo-backend.mjs';
import { platformNet } from '../supabase/functions/_shared/platformNet.js';
const require = createRequire(new URL('../app/package.json', import.meta.url));
const { chromium } = require('playwright');
const root = path.resolve('app');
const out = '.manager-shots/supervision-2026-10-21';
mkdirSync(out, { recursive: true });
const results = [], observations = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'ok' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); };
const demo = await startDemoBackend({ port: 0, quiet: true });
const initial = structuredClone(demo.db.tables);
// A synthetic session, valid only inside the disposable in-memory backend.
const session = await fetch(demo.url + '/auth/v1/token?grant_type=password', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@detailplatform.com' }),
}).then(r => r.json());
const browser = await chromium.launch();
let server;
async function serve(branchRoot) {
  if (server) await server.close();
  server = await createServer({ root, envFile: false, server: { host: 'localhost', port: 5173, strictPort: true },
    plugins: [{ name: 'supervision-held-source', enforce: 'pre',
      resolveId(source, importer) {
        if (!importer || !source.startsWith('.')) return null;
        const dest = path.resolve(path.dirname(importer.split('?')[0]), source);
        const rel = path.relative(root, dest);
        return rel.startsWith('src' + path.sep) && existsSync(path.join(branchRoot, 'app', rel)) ? dest : null;
      },
      load(id) {
        const rel = path.relative(root, id.split('?')[0]);
        if (!rel.startsWith('src' + path.sep)) return null;
        const source = path.join(branchRoot, 'app', rel);
        if (!existsSync(source)) return null;
        return readFileSync(source, 'utf8').replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify(demo.url))
          .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY', JSON.stringify('demo-anon'));
      } }],
  });
  await server.listen();
}
async function open(w, h) {
  demo.db.tables = structuredClone(initial);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(({ session }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify(session));
    localStorage.setItem('dp.tours', JSON.stringify(['shell','today','calendar','money','clients','business']));
    localStorage.setItem('dp.tour', '1');
  }, { session });
  await ctx.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost','127.0.0.1','[::1]','fonts.googleapis.com','fonts.gstatic.com','images.unsplash.com'].includes(host) ? route.continue() : route.abort();
  });
  const page = await ctx.newPage(), noise = [];
  page.on('console', m => { if (['error','warning'].includes(m.type())) noise.push(m.text()); });
  page.on('pageerror', e => noise.push(e.message));
  return { ctx, page, noise };
}
// Execute the real import handler; only its DB and membership boundaries are fake.
const importRoot = 'C:/belt-jobs/belt_97.40-20261019113835000';
const source = readFileSync(path.join(importRoot, 'supabase/functions/import-customers/index.ts'), 'utf8');
let handler, member = true;
const db = demo.db;
const supabase = { from(table) {
  const filters = []; let op = 'select', payload, from = 0, to = Infinity;
  const q = { select() { return q; }, eq(k,v) { filters.push(r => r[k] === v); return q; },
    range(a,b) { from=a; to=b; return q; }, delete() { op='delete'; return q; },
    insert(rows) { op='insert'; payload=rows; return q; },
    then(resolve, reject) {
      try {
        const rows = db.tables[table] ||= [], match = r => filters.every(f => f(r));
        let data = rows.filter(match).slice(from, to === Infinity ? undefined : to+1);
        if (op === 'delete') db.tables[table] = rows.filter(r => !match(r));
        if (op === 'insert') { data=payload.map(r => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r })); rows.push(...data); }
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      } catch(e) { return Promise.reject(e).then(resolve, reject); }
    } };
  return q;
} };
const js = await transformWithEsbuild(source.replace(/^import .*;\r?\n/gm, ''), 'import.ts', { loader:'ts', target:'esnext' });
vm.runInNewContext(js.code, { Deno: { serve(fn) { handler=fn; } }, supabase,
  json: (body,status=200) => Response.json(body,{status}), preflight: () => new Response(),
  requireMember: async () => member ? { role:'owner' } : null, crypto, console, Response });
const call = body => handler(new Request('http://localhost/import-customers', {
  method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body),
}));
try {
  // This warning was already staged when supervision started. Verify that
  // working tree explicitly; it is not an accepted branch merge.
  await serve(process.cwd());
  for (const [w,h] of [[1440,900],[768,1024],[392,844],[390,844]]) {
    const {ctx,page,noise} = await open(w,h);
    const costs=[{category:'hosting',amount_cents:1900}];
    await ctx.route('**/functions/v1/platform-admin', async route => {
      const b=route.request().postDataJSON(); let data={};
      if(b.action==='list') data={rows:[],totals:{}};
      if(b.action==='platform_net') data=platformNet({invoiceRows:[{amount_cents:10000}],costRows:costs,periodMonth:b.period});
      if(b.action==='platform_prices') data={prices:{}};
      if(b.action==='platform_cost_add') {costs.push({category:b.category,amount_cents:b.amount_cents});data={success:true,id:'local-bill'};}
      await route.fulfill({json:data});
    });
    try {
      await page.goto('http://localhost:5173/admin#money');
      const sec=page.getByRole('region',{name:'Platform bills',exact:true});
      await sec.locator('.bo-bills').waitFor(); await sec.scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
      const note=sec.getByTestId('monthsum-missing');
      check(`98.16 ${w}: partial warning beside amount`,await note.isVisible() && await note.textContent()==='3 bills not entered' && await sec.getByTestId('monthsum-net').textContent()==='$81');
      await page.screenshot({path:`${out}/bills-partial-${w}.png`});
      const row=sec.locator('[data-bill="database"]');
      await row.getByRole('button',{name:'Add it',exact:true}).click();
      await row.getByLabel('Amount',{exact:true}).fill('-5');
      check(`98.16 ${w}: negative bill refused`,await row.getByRole('button',{name:'Save',exact:true}).isDisabled());
      await row.getByLabel('Amount',{exact:true}).fill('0'); await row.getByRole('button',{name:'Save',exact:true}).click();
      await page.waitForTimeout(350);
      check(`98.16 ${w}: zero bill accepted`,await note.textContent()==='2 bills not entered');
      for(const kind of ['email','domain']) {
        const r=sec.locator(`[data-bill="${kind}"]`);
        await r.getByRole('button',{name:'Add it',exact:true}).click();
        await r.getByLabel('Amount',{exact:true}).fill('1.25');await r.getByRole('button',{name:'Save',exact:true}).click();await page.waitForTimeout(300);
      }
      check(`98.16 ${w}: complete month no warning`,await note.count()===0 && await sec.getByTestId('monthsum-net').textContent()==='$78.50');
      costs.length=0;await sec.getByRole('button',{name:'Earlier month',exact:true}).click();await page.waitForTimeout(350);
      check(`98.16 ${w}: empty month has no profit figure`,await sec.locator('.net dd').textContent()==='Not entered');
      check(`98.16 ${w}: console clean`,noise.length===0,noise.join(' | '));
      check(`98.16 ${w}: no sideways overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    } finally {await ctx.close();}
  }
  const teamRoot = 'C:/belt-jobs/belt_98.13-20261019090224443';
  await serve(teamRoot);
  for (const [w,h] of [[1440,900],[768,1024],[392,844],[390,844],[320,844]]) {
    const {ctx,page,noise} = await open(w,h);
    try {
      await page.goto('http://localhost:5173/app?settings=team');
      const access = page.getByRole('group', { name:'Access', exact:true });
      await page.locator('.wide-choice .segmented').waitFor();
      const seg = page.locator('.wide-choice .segmented');
      await seg.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      const measure = () => seg.evaluate(el => ({ height:el.getBoundingClientRect().height,
        rows:new Set([...el.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().top))).size }));
      const before = await measure();
      check(`98.13 ${w}: Access one row at normal height`, before.rows === 1 && before.height <= 50, JSON.stringify(before));
      await seg.getByRole('radio',{name:'Owner',exact:true}).click();
      check(`98.13 ${w}: Owner selects`, await seg.getByRole('radio',{name:'Owner',exact:true}).getAttribute('aria-checked') === 'true');
      await seg.getByRole('radio').first().click();
      check(`98.13 ${w}: empty invite refused`, await page.getByRole('button',{name:'Send invite',exact:true}).isDisabled());
      await page.screenshot({path:`${out}/team-${w}.png`});
      if (w === 392) {
        await page.addStyleTag({content:'.grid2:has(> .wide-choice){grid-template-columns:1fr 1fr !important}'});
        const broken = await measure();
        check('98.13: original layout sabotage detected', broken.rows !== 1 || broken.height > 50, JSON.stringify(broken));
      }
      check(`98.13 ${w}: console clean`, noise.length===0, noise.join(' | '));
    } finally { await ctx.close(); }
  }
  await serve(importRoot);
  for (const [w,h] of [[1440,900],[768,1024],[392,844]]) {
    const {ctx,page,noise} = await open(w,h);
    await ctx.route('**/functions/v1/import-customers', async route => {
      const response = await call(route.request().postDataJSON());
      await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
    });
    try {
      await page.goto('http://localhost:5173/app/clients');
      await page.getByRole('button',{name:'Import customers',exact:true}).waitFor();
      const picker = page.locator('input[type=file]');
      await picker.setInputFiles({name:'supervision.csv',mimeType:'text/csv',buffer:Buffer.from('Name,Phone,Email\nSupervisor Local,555-900-1122,local@example.invalid\nSupervisor Repeat,555-900-1122,repeat@example.invalid\nMissing Phone,,bad@example.invalid\n')});
      const save = page.getByRole('button',{name:'Save 1 customers',exact:true});
      await save.waitFor();
      await save.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await page.screenshot({path:`${out}/import-preview-${w}.png`});
      check(`97.40 ${w}: duplicate and missing phone refused in preview`, (await page.locator('body').innerText()).includes('1 new, 1 duplicates, 1 need fixing'));
      await save.click();
      await page.getByText('Saved 1 customers',{exact:true}).waitFor();
      check(`97.40 ${w}: actual handler created one customer`, db.tables.customers.filter(c=>c.name==='Supervisor Local').length===1);
      await page.getByRole('button',{name:'Undo this import',exact:true}).click();
      await page.getByText('Import undone - 1 removed',{exact:true}).waitFor();
      check(`97.40 ${w}: ordinary undo removes its batch`, !db.tables.customers.some(c=>c.name==='Supervisor Local'));
      check(`97.40 ${w}: console clean`, noise.length===0, noise.join(' | '));
    } finally {await ctx.close();}
  }
  member=false;
  const denied=await call({business_id:'not-mine',action:'commit',rows:[{name:'Denied',phone:'555-0111'}]});
  check('97.40: nonmember refused by handler',denied.status===404);
  member=true;
  const businessId = db.tables.business_users[0].business_id;
  const sentinel = {id:'supervision-protected-fixture',business_id:businessId,name:'Protected fixture',phone:'555-0999',imported:true,is_test:true,import_batch_id:'supervision-batch'};
  db.tables.customers.push(sentinel);
  const undo=await call({action:'undo',business_id:businessId,batch_id:'supervision-batch'});
  const answer=await undo.json();
  check('97.40: undo preserves flagged fixture',db.tables.customers.some(c=>c.id===sentinel.id),JSON.stringify(answer));
  observations.push({finding:'97.40 handler deletes an is_test=true imported row in the selected batch; the committed SQL test does not execute this handler or mark its Fixture as imported in that batch.'});
  const parser = await import('data:text/javascript;base64,'+Buffer.from(readFileSync(path.join(importRoot,'app/src/lib/customer-import.js'),'utf8')).toString('base64'));
  const parsed=parser.parseImportCsv('Name,Phone,Notes\nAlice,5550111,"first line\nsecond line"');
  observations.push({finding:'Multiline Notes from a normal quoted CSV field are split into another customer row.',parsed});
} catch(e) {check('supervision flow finished',false,e.stack);}
finally {
  await browser.close(); if(server) await server.close(); await demo.close();
  const receipt={at:new Date().toISOString(),main:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    branches:{team:'e3531cf3',import:'affcfade'},handler_sha256:createHash('sha256').update(source).digest('hex'),local_only:true,
    bills_working_tree:Object.fromEntries(['app/src/admin/office/places/money/Bills.jsx','app/src/admin/office/office.css','app/src/lib/officeMoney.js'].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),
    expected_checks:63,results,observations};
  writeFileSync(`${out}/result.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({out,checks:results.length,failed:results.filter(r=>!r.ok).length}));
  process.exitCode=results.length!==63 || results.some(r=>!r.ok)?1:0;
}
