// Independent supervision of 97.39, 99.14 and 99.16. No .env, real login,
// database, email or other remote service: every remote request is answered here.
// node scripts/supervision-2026-10-25.mjs [--break=starters|bookability|restore|owner]
import playwright from '../app/node_modules/playwright/index.js';
const { chromium } = playwright;
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const BASE = 'http://localhost:5173';
const broken = process.argv.find(a => a.startsWith('--break='))?.split('=')[1] || '';
if (broken && !['starters','bookability','restore','owner'].includes(broken)) throw Error('Unknown break');
const dir = `.manager-shots/supervision-2026-10-25/${broken || 'clean'}`;
const sizes = broken ? [392] : [1440,768,390,392];
const langs = broken ? ['en'] : ['en','es'];
mkdirSync(dir, { recursive: true });
const failures = [], consoles = [], artifacts = [], findings = [], injections = [];
let assertions = 0, completed = 0;
const check = (id, name, ok, detail = '') => { assertions++; if (!ok) failures.push(`${id}: ${name}: ${detail}`); };
const user = { id:'00000000-0000-4000-8000-000000000025', email:'supervisor@example.com', aud:'authenticated', role:'authenticated' };
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const exp = Math.floor(Date.now()/1000)+86400;
// Invented session, never sent to a remote server.
const session = { access_token:`${b64({alg:'HS256'})}.${b64({sub:user.id,exp,role:'authenticated'})}.fake`, refresh_token:'fake',token_type:'bearer',expires_in:86400,expires_at:exp,user };
const business = {id:'supervision',name:'Harbor Shine',slug:'supervision',status:'active',contact_phone:'5551234567',email:'owner@example.com',site_url:'https://example.com'};
const counts = {services:3,hoursRows:[{open_time:'09:00',close_time:'17:00'}]};
const row = (id,name,extra={}) => ({...business,id,slug:id,name,is_demo:false,owner_email:'owner@example.com',created_at:'2026-08-01T12:00:00Z',bookings_total:20,days_since_booking:1,jobs_month:5,revenue_month:500,customers:5,setup_inputs:{counts,settings:{},branding:{},business},...extra});
const rows = [row('blocked','No Services',{setup_inputs:{counts:{...counts,services:0},settings:{},branding:{},business}}),row('healthy','Healthy Detail'),row('closed','No Open Days',{setup_inputs:{counts:{...counts,hoursRows:[]},settings:{},branding:{},business}}),row('suspended','Kestrel Auto Spa',{status:'paused'}),row('unpaid','Larch Mobile Spa',{status:'paused',awaiting_first_payment:true}),row('ownerless','Harbor Shine')];
const browser = await chromium.launch();
const settle = page => page.waitForTimeout(1000);
async function open(size,lang='en',existing=false) {
 const ctx = await browser.newContext({viewport:{width:size,height:size===768?1024:size===1440?900:844}});
 await ctx.addInitScript(({session,lang}) => { localStorage.setItem('sb-kguqylyzgyzfktkfnhjb-auth-token',JSON.stringify(session));localStorage.setItem('dp.lang.app',lang); },{session,lang});
 const sent=[], services=existing?[{id:'existing',name:'Existing detail',price:90,is_active:true,duration_minutes:60}]:[];
 await ctx.route('**/*',async route => {
  const req=route.request(),url=new URL(req.url());
  if (url.origin===BASE) {
   if (url.pathname==='/sw.js') return route.fulfill({contentType:'text/javascript',body:'// Inert supervision worker: every request stays inside the browser fixture.'});
   if (url.pathname==='/preview') return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Supervision handoff boundary</title><p>Preview tab counted; authentication inside it is outside this UI proof.</p>'});
   const target = broken==='starters' && url.pathname==='/src/screens/more/Catalog.jsx' || ['restore','owner'].includes(broken) && url.pathname==='/src/admin/office/DetailerPanel.jsx' || broken==='bookability' && url.pathname==='/src/lib/officeDetailers.js';
   if (!target) return route.continue();
   const res=await route.fetch(); const source=await res.text();
   const changed=broken==='starters'?source.replace('price: Number(starterPrices[x.key])','price: Number(x.price)'):broken==='bookability'?source.replace('const blocked = bookabilityOf(r).reasons.filter','const blocked = [].filter'):broken==='restore'?source.replace('onClick: () => setSure(true)','onClick: () => act("restore")'):source.replaceAll('hasOwner === false','false');
   if (changed===source) throw Error(`Sabotage did not land: ${broken}`);
   injections.push(url.pathname); return route.fulfill({response:res,body:changed});
  }
  // Deny-by-default remote boundary. No real auth, rows, functions or budgets.
  if (url.pathname.startsWith('/auth/v1/')) return route.fulfill({json:url.pathname.endsWith('/user')?user:{}});
  if (url.pathname.includes('/functions/v1/')) {
   const body=JSON.parse(req.postData()||'{}');sent.push(body);
   if (body.action==='whoami') return route.fulfill({json:{email:user.email}});
   if (body.action==='list') return route.fulfill({json:{rows,totals:{}}});
   if (body.action==='get') return route.fulfill({json:{bookings:[],invoices:[],events:[],members:body.business_id==='ownerless'?[]:[{email:'owner@example.com',role:'owner'}]}});
   if (body.action==='impersonate') return route.fulfill({json:{access_token:'fake-preview',expires_at:new Date(Date.now()+3600e3).toISOString()}});
   return route.fulfill({json:{}});
  }
  if (url.pathname.startsWith('/rest/v1/')) {
   const table=url.pathname.split('/').pop();
   if (req.method()==='POST' && table==='services') {const body=JSON.parse(req.postData());sent.push({table,body});services.push(...body.map((r,i)=>({...r,id:`new-${i}`})));return route.fulfill({status:201,body:''});}
   if (!['GET','HEAD'].includes(req.method())) {sent.push({table,method:req.method()});return route.fulfill({status:204,body:''});}
   const data=table==='services'?services:table==='business_users'?[{business_id:business.id,role:'owner',permissions:[],businesses:{name:business.name}}]:table==='businesses'?business:table==='business_settings'?{business_id:business.id,setup:{done:[]},vehicle_sizes:[]}:table==='business_branding'?{business_id:business.id}:table==='site_intake'?{dismissed:true}:table==='platform_subscriptions'?null:[];
   return route.fulfill({json:data});
  }
  return route.fulfill({status:200,body:''});
 });
 const page=await ctx.newPage();
 page.on('console',m=>{if(['warning','error'].includes(m.type()))consoles.push(`${size}/${lang}: ${m.type()}: ${m.text()}`);});
 page.on('pageerror',e=>consoles.push(`${size}/${lang}: ${e.message}`));
 page.on('response',r=>{if(r.status()>=400)consoles.push(`${size}/${lang}: HTTP ${r.status()} ${new URL(r.url()).pathname}`);});
 const popups=[];ctx.on('page',p=>popups.push(p));
 return {ctx,page,sent,popups};
}
async function shot(page,name) {await settle(page);const p=`${dir}/${name}.png`;await page.screenshot({path:p});artifacts.push(p);}
try {
 for(const size of sizes) {
  for(const lang of langs) {
   const id=`97.39/${size}/${lang}`; const {ctx,page,sent}=await open(size,lang);
   await page.goto(`${BASE}/app?settings=catalog`); await page.waitForSelector('[data-testid="starter-services"]');await settle(page);
   const card=page.locator('[data-testid="starter-services"]'),boxes=card.locator('input');
   check(id,'three prices offered',JSON.stringify(await boxes.evaluateAll(es=>es.map(e=>e.value)))==='["120","150","250"]');
   await shot(page,`starters-${size}-${lang}`);
   const add=card.locator('button.primary');
   for(const value of ['', '0']) {await boxes.first().fill(value);check(id,`price ${JSON.stringify(value)} refuses`,await add.isDisabled());check(id,'refusal writes nothing',!sent.some(x=>x.table==='services'));}
   await shot(page,`starters-refused-${size}-${lang}`);
   await boxes.first().fill('95');await add.click();await page.waitForSelector('[data-testid="starter-services"]',{state:'detached'});
   const posts=sent.filter(x=>x.table==='services');check(id,'one request with three edited prices',posts.length===1 && JSON.stringify(posts[0].body.map(x=>x.price))==='[95,150,250]',JSON.stringify(posts));
   check(id,'names follow language',posts[0]?.body[0]?.name===(lang==='es'?'Detallado exterior':'Exterior detail'));
   await shot(page,`starters-added-${size}-${lang}`);await ctx.close();
   const skip=await open(size,lang);await skip.page.goto(`${BASE}/app?settings=catalog`);await skip.page.waitForSelector('[data-testid="starter-services"]');await skip.page.locator('[data-testid="starter-services"] button').last().click();check(id,'Skip adds no services',!skip.sent.some(x=>x.table==='services') && await skip.page.locator('[data-testid="starter-services"]').count()===0);await skip.ctx.close();
   completed++;
  }
  const {ctx,page,sent,popups}=await open(size);await page.goto(`${BASE}/admin#detailers`);await page.waitForSelector('.bo-row');await settle(page);
  for(const [name,reason] of [['No Services','No active services'],['No Open Days','No open days']]) {const r=page.locator('.bo-row',{hasText:name});check(`99.14/${size}`,`${name} flagged`,(await r.textContent()).includes("Can't take bookings"));await r.click();await page.waitForSelector('.bo-panel');await settle(page);check(`99.14/${size}`,`${name} explains missing piece`,(await page.locator('.bo-panel').innerText()).includes(reason));await shot(page,`bookability-${name.replaceAll(' ','-')}-${size}`);await page.keyboard.press('Escape');await page.waitForSelector('.bo-panel',{state:'detached'});}
  check(`99.14/${size}`,'healthy account is not called unbookable',!(await page.locator('.bo-row',{hasText:'Healthy Detail'}).innerText()).includes("Can't take bookings"));
  await shot(page,`office-list-${size}`);
  for(const [name,button,yes] of [['Kestrel Auto Spa','Reopen account','Yes, let them back in'],['Larch Mobile Spa','Put live without payment','Yes, put them live']]) {
   const id=`99.16/${size}/${name}`;await page.locator('.bo-row',{hasText:name}).click();await page.waitForSelector('.bo-panel');await settle(page);
   const footer=page.locator('.bo-pfoot'),before=sent.filter(x=>x.action==='restore').length;
   await footer.getByRole('button',{name:button,exact:true}).click();await settle(page);
   check(id,'first press makes no restore call',sent.filter(x=>x.action==='restore').length===before);
   const q=footer.locator('.bo-sure');check(id,'question names business',await q.count()===1 && (await q.innerText()).includes(name));
   await page.evaluate(()=>document.querySelector('.bo-pscroll').scrollTo(0,1e5));
   await shot(page,`restore-question-${name.split(' ')[0]}-${size}`);
   if(await q.count()) {await footer.getByRole('button',{name:'Not yet',exact:true}).click();check(id,'Not yet sends nothing',sent.filter(x=>x.action==='restore').length===before);await footer.getByRole('button',{name:button,exact:true}).click();await footer.getByRole('button',{name:yes,exact:true}).click();await settle(page);check(id,'answer sends one restore',sent.filter(x=>x.action==='restore').length===before+1);}
   await page.keyboard.press('Escape');await page.waitForSelector('.bo-panel',{state:'detached'});
  }
  await page.locator('.bo-row',{hasText:'Harbor Shine'}).click();await page.waitForSelector('.bo-panel');await settle(page);
  const look=page.getByRole('button',{name:'Look at their dashboard',exact:true});
  check(`99.16/${size}`,'ownerless Look disabled',await look.isDisabled());check(`99.16/${size}`,'reason written',await page.locator('.bo-nolook').count()===1);
  await look.scrollIntoViewIfNeeded();await look.click({force:true,timeout:1500}).catch(()=>{});check(`99.16/${size}`,'forced press sends no impersonate',!sent.some(x=>x.action==='impersonate'));await shot(page,`ownerless-${size}`);
  await page.keyboard.press('Escape');await page.waitForSelector('.bo-panel',{state:'detached'});
  await page.locator('.bo-row',{hasText:'Healthy Detail'}).click();await page.waitForSelector('.bo-panel');await settle(page);
  const enabledLook=page.getByRole('button',{name:'Look at their dashboard',exact:true});
  check(`99.16/${size}`,'owner present permits Look without false reason',await enabledLook.isEnabled() && await page.locator('.bo-nolook').count()===0);
  const beforeLook=sent.filter(x=>x.action==='impersonate').length,beforeTabs=popups.length;
  await enabledLook.scrollIntoViewIfNeeded();await shot(page,`owner-present-${size}`);await enabledLook.click();await settle(page);
  check(`99.16/${size}`,'owner present sends one scoped impersonate and opens one tab',sent.filter(x=>x.action==='impersonate').length===beforeLook+1 && sent.at(-1)?.business_id==='healthy' && popups.length===beforeTabs+1);
  for(const tab of popups)await tab.close().catch(()=>{});
  findings.push({size,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await ctx.close();completed++;
 }
 const e=await open(392,'en',true);await e.page.goto(`${BASE}/app?settings=catalog`);await e.page.waitForSelector('.menu-row');check('97.39/existing','existing services suppress offer',await e.page.locator('[data-testid="starter-services"]').count()===0);await e.ctx.close();
} catch(e) {failures.push(`Run stopped: ${e.stack}`);} finally {await browser.close();}
const expected = sizes.length*(langs.length+1);
check('population','all scenes completed',completed===expected,`${completed}/${expected}`);
check('console','no warnings or errors',consoles.length===0,consoles.join('\n'));
if(broken) check('sabotage','production rewrite applied',injections.length>0);
const result={git_sha:execSync('git rev-parse HEAD',{encoding:'utf8'}).trim(),command:`node scripts/supervision-2026-10-25.mjs${broken?` --break=${broken}`:''}`,scope:'Browser UI and captured payloads only. All remote requests intercepted; no credentials, server writes or email.',completed,assertions,failures,consoles,findings,injections,artifacts};
writeFileSync(`${dir}/result.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({completed,assertions,failures,consoleCount:consoles.length,injections:injections.length,dir},null,2));process.exitCode=failures.length?1:0;
