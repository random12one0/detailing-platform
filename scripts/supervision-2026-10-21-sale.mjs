// Independent local product walk. No env files, real account, external API,
// database, email or paid service. The backend is explicitly an in-memory fake.
// Run from repo root: node scripts/supervision-2026-10-21-sale.mjs
// --break=guard serves the pre-fix component; the same refusal must fail.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createServer } from '../app/node_modules/vite/dist/node/index.js';
import react from '../app/node_modules/@vitejs/plugin-react/dist/index.js';
import { startDemoBackend } from '../../belt/demo-backend.mjs';
const require = createRequire(new URL('../app/package.json', import.meta.url));
const { chromium } = require('playwright');
const broken = process.argv.includes('--break=guard');
const out = `.manager-shots/supervision-2026-10-21-sale${broken ? '-sabotage' : ''}`;
mkdirSync(out, {recursive:true});
const sha = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const root = path.resolve('app'), results = [];
const check = (name, ok, detail='') => {results.push({name,ok,detail});console.log(`${ok?'ok':'FAIL'} ${name}${detail?' '+detail:''}`);};
const demo = await startDemoBackend({port:0,quiet:true});
const initial = structuredClone(demo.db.tables);
const fakeSession = await fetch(demo.url+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo@detailplatform.com'})
}).then(r=>r.json());
const server = await createServer({root,configFile:false,envFile:false,plugins:[{
  name:'offline-supervision',enforce:'pre',load(id) {
    const clean=path.resolve(id.split('?')[0]);
    if(!clean.startsWith(path.join(root,'src')+path.sep)) return null;
    let s=readFileSync(clean,'utf8');
    if(broken && clean.endsWith(path.join('more','Promos.jsx'))) {
      s=execFileSync('git',['show','c3678a82:app/src/screens/more/Promos.jsx'],{encoding:'utf8'});
    }
    return s.replaceAll('import.meta.env.VITE_SUPABASE_URL',JSON.stringify(demo.url))
      .replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY',JSON.stringify('offline-placeholder'));
  }
},react()],server:{host:'localhost',port:5173,strictPort:true},logLevel:'error'});
let browser;
try {
  await server.listen(); browser=await chromium.launch();
  for(const [w,h] of [[390,844],[1440,900],[768,1024],[392,844],[320,844],[1920,1080]]) {
    demo.db.tables=structuredClone(initial);
    for(const row of demo.db.tables.business_settings) Object.assign(row,{site_discount_active:false,site_discount_percent:0});
    const ctx=await browser.newContext({viewport:{width:w,height:h}});
    await ctx.addInitScript(({s})=>{localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},{s:fakeSession});
    await ctx.route('**/*',r=>{
      const u=new URL(r.request().url());
      return ['localhost','127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();
    });
    const page=await ctx.newPage(),noise=[];let writes=0, release, arrived;
    const started=new Promise(r=>{arrived=r;});
    const held=new Promise(r=>{release=r;});
    page.on('console',m=>{if(['error','warning'].includes(m.type()))noise.push(m.text());});
    page.on('pageerror',e=>noise.push(e.message));
    await page.route('**/rest/v1/business_settings?*',async r=>{
      if(r.request().method()==='PATCH') {
        writes++; arrived(); await held;
      }
      return r.continue();
    });
    try {
      await page.goto('http://localhost:5173/app?settings=promos');
      const save=page.getByRole('button',{name:'Save sale',exact:true});
      await save.waitFor();
      await page.getByText('Sale is running',{exact:true}).click();
      await save.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
      check(`${w}: running at zero refused`,await save.isDisabled());
      check(`${w}: refusal sends no update`,writes===0);
      await page.screenshot({path:`${out}/zero-${w}.png`});
      await page.getByRole('button',{name:'10%',exact:true}).first().click();
      check(`${w}: ten percent enables Save`,await save.isEnabled());
      await save.click();await Promise.race([started,new Promise((_,rej)=>setTimeout(()=>rej(new Error('no save request')),5000))]);
      check(`${w}: delayed write disables Save`,await save.isDisabled());
      await save.evaluate(el=>el.click());
      // Allow the browser request to cross the HTTP boundary. Reading the
      // count in the same turn as click() falsely passed on the old handler.
      await page.waitForTimeout(250);
      check(`${w}: another press sends no duplicate`,writes===1);
      release();
      await page.getByText('Sale settings saved.',{exact:true}).waitFor();
      check(`${w}: saved row is active at ten`,demo.db.tables.business_settings.some(r=>r.site_discount_active===true&&r.site_discount_percent===10));
      check(`${w}: Save recovers after response`,await save.isEnabled());
      await page.screenshot({path:`${out}/saved-${w}.png`});
      await page.getByText('Sale is running',{exact:true}).click();
      check(`${w}: switched off can save`,await save.isEnabled());
      check(`${w}: no sideways scroll`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      check(`${w}: console clean`,noise.length===0,noise.join('|'));
    } catch(e) {
      await page.screenshot({path:`${out}/interrupted-${w}.png`});
      console.log(JSON.stringify({url:page.url(),noise,screen:(await page.locator('body').innerText()).slice(0,1600)}));
      throw e;
    } finally {release?.();await ctx.close();}
  }
} catch(e) {check('walk completed',false,e.stack);}
finally {
  await browser?.close();await server.close();await demo.close();
  const expected=60;
  const receipt={at:new Date().toISOString(),git_sha:sha,local_only:true,break:broken?'pre-fix Promos.jsx':null,expected,discovered:results.length,results,
    limitations:['in-memory backend; no live RLS, deployment or persisted production row proved']};
  writeFileSync(`${out}/result.json`,JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({expected,discovered:results.length,failed:results.filter(r=>!r.ok).length,out}));
  process.exitCode=results.length!==expected||results.some(r=>!r.ok)?1:0;
}
