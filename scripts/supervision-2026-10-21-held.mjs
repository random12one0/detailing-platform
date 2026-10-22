// Reproduce held 97.28's workflow and browser checker, without installing it.
// No env files, live API, GitHub calls, mail, or production writes.
// node scripts/supervision-2026-10-21-held.mjs
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from '../app/node_modules/vite/dist/node/index.js';
import react from '../app/node_modules/@vitejs/plugin-react/dist/index.js';
const ref='62c8c7b19541a943e448f32b3e2cb9ef6dfaa0ce';
const out=path.resolve('.manager-shots/supervision-2026-10-21-held');
mkdirSync(out,{recursive:true});
const source=f=>execFileSync('git',['show',`${ref}:${f}`],{encoding:'utf8'});
const results=[];
const check=(name,ok,detail='')=>{results.push({name,ok,detail});console.log(`${ok?'ok':'FAIL'} ${name}${detail?' '+detail:''}`);};
writeFileSync(path.join(out,'pruneHarness.mjs'),source('scripts/lib/pruneHarness.mjs'));
const {findBash,checkGnuDate,pruneStep,runPrune,mutate}=await import(pathToFileURL(path.join(out,'pruneHarness.mjs')));
const bash=findBash(),step=pruneStep(source('docs/ops/backup.live-copy.yml'));
check('real GNU date available',checkGnuDate(bash).ok);
const tags=['backup-2027-05-31','backup-2027-03-01','backup-2027-02-01','v1.0'];
const run=(s,opts={})=>runPrune({bash,step:s,today:'2027-05-31',tags,...opts});
const deletes=r=>r.deletes.map(l=>l.split(' ')[1]);
const clean=run(step);
check('actual shell keeps March, deletes February, leaves unrelated release',clean.status===0&&JSON.stringify(deletes(clean))===JSON.stringify(['backup-2027-02-01']),JSON.stringify(clean.ledger));
const failed=run(step,{listOk:false});
check('actual shell refuses failed listing',failed.status!==0&&failed.deletes.length===0);
for(const name of ['forever','twelve','noprint']) {
  const bad=run(mutate(name,step));
  check(`${name}: same deletion expectation detects mutation`,!deletes(bad).includes('backup-2027-02-01'));
}
check('exitzero: same refusal expectation detects mutation',run(mutate('exitzero',step),{listOk:false}).status===0);
const root=path.resolve('app');
const server=await createServer({root,configFile:false,envFile:false,plugins:[{
  name:'held-legal-only',enforce:'pre',load(id) {
    const f=path.resolve(id.split('?')[0]);if(!f.startsWith(path.join(root,'src')+path.sep))return null;
    const s=f.endsWith(path.join('landing','legal.js'))?source('app/src/landing/legal.js'):readFileSync(f,'utf8');
    return s.replaceAll('import.meta.env.VITE_SUPABASE_URL',JSON.stringify('http://localhost:5173/offline-only'))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY',JSON.stringify('offline-placeholder'));
  }
},react()],server:{host:'localhost',port:5173,strictPort:true},logLevel:'error'});
const chromiumUrl=pathToFileURL(path.resolve('app/node_modules/playwright/index.mjs')).href;
const original=source('scripts/privacy-backup-period.mjs');
writeFileSync(path.join(out,'receipt-stub.mjs'),`import {writeFileSync} from 'node:fs';export function writeReceipt(r){writeFileSync('receipt.json',JSON.stringify(r,null,2));}`);
const adapted=original.replace('"../app/node_modules/playwright/index.mjs"',JSON.stringify(chromiumUrl))
  .replace('"./receipt.mjs"',JSON.stringify(pathToFileURL(path.join(out,'receipt-stub.mjs')).href));
async function child(name,code,args=[]) {
  const dir=path.join(out,name);mkdirSync(path.join(dir,'receipts'),{recursive:true});
  const file=path.join(dir,'probe.mjs');writeFileSync(file,code);
  return new Promise(resolve=>{
    const p=spawn(process.execPath,[file,'--base=http://localhost:5173',`--shots=${path.join(dir,'shots')}`,...args],{cwd:dir,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let log='';p.stdout.on('data',b=>log+=b);p.stderr.on('data',b=>log+=b);
    p.on('close',status=>{writeFileSync(path.join(dir,'run.txt'),log);resolve({status,log});});
  });
}
try {
  await server.listen();
  const {chromium}=await import(chromiumUrl);
  const browser=await chromium.launch();
  try {
    for(const [w,h] of [[1440,900],[768,1024],[392,844],[390,844]]) {
      const ctx=await browser.newContext({viewport:{width:w,height:h}}),page=await ctx.newPage(),noise=[];
      page.on('console',m=>{if(['error','warning'].includes(m.type()))noise.push(m.text());});
      page.on('pageerror',e=>noise.push(e.message));
      try {
        await page.goto('http://localhost:5173/privacy');
        const row=page.locator('.legalrow',{hasText:'How long'});
        await row.scrollIntoViewIfNeeded();
        await page.waitForFunction(e=>getComputedStyle(e).opacity==='1',await row.elementHandle(),{timeout:5000}).catch(()=>{});
        const reading=await row.evaluate(e=>({text:e.textContent,opacity:getComputedStyle(e).opacity}));
        check(`privacy ${w}: three-month disclosure painted`,reading.text.includes('for 3 months')&&reading.opacity==='1',JSON.stringify(reading));
        await page.screenshot({path:path.join(out,`privacy-${w}.png`)});
        await page.goto('http://localhost:5173/terms');
        const date=page.locator('.legalnote',{hasText:'Effective'});
        await date.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
        check(`terms ${w}: shared date October 21`,(await date.textContent()).includes('October 21, 2026'));
        await page.screenshot({path:path.join(out,`terms-${w}.png`)});
        check(`legal ${w}: console clean`,noise.length===0,noise.join('|'));
      }finally{await ctx.close();}
    }
  }finally{await browser.close();}
  const first=await child('exact-held',adapted);
  check('held browser check crashes on its out-of-scope canary',first.status!==0&&first.log.includes('canaryCaught is not defined'),`exit ${first.status}`);
  // Diagnostic change in scratch only: unmask the next defect without fixing
  // or merging the held branch. All disclosure assertions remain untouched.
  const scopeOnly=adapted.replace('const browser = await chromium.launch','let canaryCaught = false;\nconst browser = await chromium.launch').replace('  let canaryCaught = false;','  canaryCaught = false;');
  check('scratch scope-only diagnostic landed',scopeOnly!==adapted);
  const second=await child('scope-only-sabotage',scopeOnly,['--break=old-words']);
  const receipt=JSON.parse(readFileSync(path.join(out,'scope-only-sabotage','receipt.json'),'utf8'));
  check('after fixing only scope, missing disclosure wrongly returns pass',second.status===0&&receipt.status==='pass'&&receipt.failures.length===0&&receipt.dimensions.break==='old-words',`exit ${second.status}, status ${receipt.status}`);
}finally {
  await server.close();
  writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),ref,local_only:true,expected:22,results,limitations:['held source only; private workflow not installed; no delivery sent']},null,2));
  console.log(JSON.stringify({expected:22,discovered:results.length,failed:results.filter(r=>!r.ok).length,out}));
  process.exitCode=results.length!==22||results.some(r=>!r.ok)?1:0;
}
