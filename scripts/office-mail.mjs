// 9.12a slice 6c. No credentials, database writes or email sends: every API
// request is intercepted. BASE points at the dev server. --freeze=before|after
// captures the same System situation; --break=hidden reproduces the missing list.
// Six declared widths, 26 questions each, overlap and contrast canaries.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { writeReceipt } from './receipt.mjs';
const { chromium } = createRequire(import.meta.url)('../app/node_modules/playwright/index.js');
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const BREAK = arg('break'), FREEZE = arg('freeze'), LITE = process.argv.includes('--lite');
const BASE = process.env.BASE || 'http://127.0.0.1:5182';
const SHOTS = 'C:/Users/rando/Downloads/claude/belt/shots/9.12a';
const ART = `artifacts/office-mail${LITE ? '-lite' : ''}${BREAK ? '-sabotage' : ''}`;
const SIZES = [[390,844],[392,844],[320,844],[768,1024],[1440,900],[1920,1080]];
const started_at = new Date().toISOString();
const states = ['delivered','sent','bounced','complained','failed','refused','skipped'];
const bad = ['bounced','complained','failed','refused','skipped'];
const ROWS = states.map((status,i) => ({id:`mail-${i}`,status,
  subject: i === 0 ? 'Your full detail is booked — an unusually long subject that must stay readable on a phone' : `Mail subject ${i}`,
  to_email: i === 0 ? 'averylongrecipientaddress@harborshinedetailing.mail.example' : `person${i}@example.com`,
  business_name: 'Harbor Shine Mobile Detailing and Ceramic Protection',
  sent_at: new Date(Date.now()-i*86400000).toISOString(),
  detail: bad.includes(status) ? 'The receiving server refused this address.' : null, booking_id:null}));
const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
const exp = Math.floor(Date.now()/1000)+86400;
const user = {id:'00000000-0000-4000-8000-000000000001',email:'andrew@example.com',role:'authenticated',aud:'authenticated'};
const SESSION = {access_token:`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,exp,role:user.role})}.x`,refresh_token:'fake',token_type:'bearer',expires_at:exp,expires_in:86400,user};
const failures=[], artifacts=[], observed={}; let assertions=0, discovered=0,completed=0;
const canary={id:'overlapping-mail-subject',observed_failure:false};
const check=(w,name,yes,detail='') => {assertions++; if(!yes) failures.push(`${w}: ${name} ${detail}`); console.log(`${yes?'ok':'FAIL'} ${w} ${name}`);};
const geometry=() => {
  const scope=document.querySelector('.bo-mail'); if(!scope) return {missing:true};
  const els=[...scope.querySelectorAll('button, .bo-mail-subject, .bo-mail-status, .bo-mail-meta span, time, .bo-mail-detail')].filter(e=>e.getBoundingClientRect().width>0);
  const overlaps=[],cut=[];
  for(let i=0;i<els.length;i++) {const a=els[i].getBoundingClientRect(); if(a.left<0||a.right>innerWidth)cut.push(els[i].textContent);
    for(let j=i+1;j<els.length;j++){const b=els[j].getBoundingClientRect();if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))overlaps.push([els[i].textContent,els[j].textContent]);}}
  return {count:els.length,overlaps,cut};
};
const inspectorSource=readFileSync('scripts/contrast-insitu.mjs','utf8');
const inspectorStart=inspectorSource.indexOf('const PROBE = () => {');
const inspectorEnd=inspectorSource.indexOf('\nconst browser =',inspectorStart);
if(inspectorStart<0||inspectorEnd<0)throw Error('contrast inspector not found');
const inspector=inspectorSource.slice(inspectorStart,inspectorEnd).trim().replace('const PROBE = ','').replace(/;$/,'')
  .replace('document.body.appendChild(canary)','document.querySelector(".bo-mail").appendChild(canary)')
  .replace('document.querySelectorAll("body *")','document.querySelectorAll(".bo-mail *")');
const browser=await chromium.launch();
async function open(w,h) {
  const context=await browser.newContext({viewport:{width:w,height:h}});
  await context.addInitScript(v=>localStorage.setItem('sb-kguqylyzgyzfktkfnhjb-auth-token',v),JSON.stringify(SESSION));
  const page=await context.newPage(),sent=[],noise=[]; let mode='normal',hold=null;
  page.on('console',m=>{if(['warning','error'].includes(m.type()))noise.push(m.text());}); page.on('pageerror',e=>noise.push(e.message));
  await page.route('**/auth/v1/**',r=>r.fulfill({json:user}));
  await page.route('**/functions/v1/platform-admin',async r=>{
    const body=r.request().postDataJSON();sent.push(body);
    if(body.action==='whoami')return r.fulfill({json:{email:user.email}});
    if(body.action==='list')return r.fulfill({json:{rows:[],totals:{},heartbeats:[]}});
    if(body.action!=='email_list')throw Error(`unexpected action ${body.action}`);
    if(mode==='hold'){hold=r;return;}
    if(mode==='refuse')return r.fulfill({status:400,json:{error:'The email log is temporarily unavailable.'}});
    if(mode==='malformed')return r.fulfill({json:{}});
    const rows=mode==='empty'?[]:ROWS.filter(m=>!body.statuses||body.statuses.includes(m.status));
    return r.fulfill({json:{rows}});
  });
  if(BREAK==='hidden')await page.addStyleTag({content:'.bo-mail {display:none!important}'}).catch(()=>{});
  await page.goto(`${BASE}/admin${LITE?'?lite=1':''}#system`);
  await page.waitForSelector('.bo-system'); await page.waitForTimeout(1300);
  if(BREAK==='hidden')await page.addStyleTag({content:'.bo-mail {display:none!important}'});
  return {page,context,sent,noise,setMode:v=>{mode=v;},held:()=>hold};
}
try {
  if(FREEZE) {
    const {freeze,differs}=await import('file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs');
    const {page,context}=await open(390,844);
    await freeze(page,{out:`${SHOTS}/${FREEZE}.html`,label:FREEZE==='before'?'Before':'After',note:FREEZE==='before'?'System has no list of the emails sent for detailers.':'System now shows sent emails, their recipients and delivery problems.',highlight:FREEZE==='before'?'.bo-gauges':'.bo-mail'});
    if(FREEZE==='after') {
      console.log('differs=',await differs(page,`${SHOTS}/before.html`,`${SHOTS}/after.html`));
      writeFileSync(`${SHOTS}/where.json`,JSON.stringify({what:'The mail list now lives on System in the rebuilt back office.',url:`${BASE}/admin#system`,how:'Open System, then scroll to Email we sent.',situation:'Seven emails, including a long subject and address, a delivery, an email on its way and five problem states.'},null,2));
    }
    await context.close();
  } else {
    mkdirSync(ART,{recursive:true});
    for(const [w,h] of SIZES) {
      const {page,context,sent,noise,setMode,held}=await open(w,h);
      try {
        const sec=page.locator('.bo-mail');
        if(await sec.count())discovered++;
        check(w,'mail list visible',await sec.isVisible());
        if(!await sec.isVisible())continue;
        // 9.12d: the section arrives folded; its preview must name the problems before any press.
        check(w,'arrives folded and the preview names the five problems',await sec.locator('details').evaluate(d=>!d.open)&&(await sec.locator('[data-peek=bad] b').textContent())==='5'&&await sec.locator('[data-peek=bad]').isVisible());
        await sec.locator('summary').click(); await page.waitForTimeout(300);
        await sec.scrollIntoViewIfNeeded(); await sec.evaluate(e=>e.scrollIntoView({block:'start'})); await page.waitForTimeout(400);
        check(w,'seven declared rows',await sec.locator('[data-mail-id]').count()===7);
        check(w,'Everything request has limit 100 and no status filter',sent.some(b=>b.action==='email_list'&&b.limit===100&&!('statuses'in b)));
        check(w,'every subject appears in full',await sec.locator('.bo-mail-subject').evaluateAll(es=>es.map(e=>e.textContent)).then(a=>JSON.stringify(a)===JSON.stringify(ROWS.map(r=>r.subject))));
        check(w,'all recipient addresses and detailer names retained',(await sec.textContent()).includes(ROWS[0].to_email)&&(await sec.locator('.bo-mail-meta').count())===7);
        check(w,'seven status labels',await sec.locator('.bo-mail-status').count()===7&&(await sec.textContent()).includes('On its way')&&(await sec.textContent()).includes('our daily limit'));
        check(w,'five failure reasons',await sec.locator('.bo-mail-detail').count()===5);
        check(w,'seven exact dates',await sec.locator('time[datetime]').count()===7);
        let g=await page.evaluate(geometry);
        check(w,'no text overlap',g.count>=35&&g.overlaps.length===0,JSON.stringify(g.overlaps));
        check(w,'nothing cut by a screen edge',g.cut.length===0,JSON.stringify(g.cut));
        check(w,'filters have 44px hit areas',await sec.locator('button').evaluateAll(es=>es.length===2&&es.every(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+22);return r.height>=44&&(hit===e||e.contains(hit));})));
        const image=`${ART}/mail-${w}.png`;await page.screenshot({path:image});artifacts.push(image);
        const full=`${ART}/mail-full-${w}.png`;await page.screenshot({path:full,fullPage:true});artifacts.push(full);
        check(w,'bounded list scrolls to the last email',await sec.locator('.bo-mail-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;const moved=e.scrollTop>0;const a=e.getBoundingClientRect(),b=e.querySelector('li:last-child').getBoundingClientRect();e.scrollTop=0;return moved&&b.bottom<=a.bottom+1;}));
        if(w===390){let caught=0;for(let n=0;n<5;n++){await page.evaluate(()=>{const e=document.querySelector('.bo-mail-subject'),c=e.cloneNode(true);c.dataset.canary='1';c.style.cssText='position:absolute;inset:0';e.style.position='relative';e.append(c);});const badG=await page.evaluate(geometry);if(badG.overlaps.length>0)caught++;await page.evaluate(()=>document.querySelector('[data-canary]').remove());}canary.observed_failure=caught===5;canary.detail=`${caught} of 5 overlap injections caught`;}
        // Scope the established painted-background contrast inspector to this section.
        const contrast=await page.evaluate(`(${inspector})()`);
        const issues=contrast.rows.filter(r=>r.text!=='canary grey on grey');
        check(w,'mail text contrast measured and unreadable canary caught',contrast.examined>=35&&contrast.canaryCaught&&issues.length===0,JSON.stringify(issues));
        await sec.getByRole('button',{name:'Problems',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.bo-mail [data-mail-id]').length===5);
        check(w,'Problems sends all five bad states',JSON.stringify(sent.at(-1).statuses)===JSON.stringify(bad));
        check(w,'Problems excludes delivered and in-flight rows',await sec.locator('[data-mail-id="mail-0"], [data-mail-id="mail-1"]').count()===0);
        setMode('refuse');await sec.getByRole('button',{name:'Everything',exact:true}).click();await page.waitForSelector('.bo-mail [data-mail-state=failed]');
        check(w,'refusal shows server sentence',(await sec.textContent()).includes('The email log is temporarily unavailable.'));
        check(w,'failed read never claims empty',await sec.locator('[data-mail-state=empty]').count()===0&&await sec.locator('[data-mail-id]').count()===0);
        await sec.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
        const refusedImage=`${ART}/refused-${w}.png`;await page.screenshot({path:refusedImage});artifacts.push(refusedImage);
        setMode('normal');await sec.getByRole('button',{name:'Try again',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.bo-mail [data-mail-id]').length===7);
        check(w,'retry restores list',await sec.locator('[data-mail-state=failed]').count()===0);
        setMode('malformed');await sec.getByRole('button',{name:'Problems',exact:true}).click();await page.waitForSelector('.bo-mail [data-mail-state=failed]');
        check(w,'malformed success is a failed read',(await sec.textContent()).includes('without a list')&&await sec.locator('[data-mail-state=empty]').count()===0);
        setMode('empty');await sec.getByRole('button',{name:'Try again',exact:true}).click();await page.waitForSelector('.bo-mail [data-mail-state=empty]');
        check(w,'empty Problems says no problems',(await sec.textContent()).includes('No email has bounced'));
        await sec.getByRole('button',{name:'Everything',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.bo-mail [data-mail-state=empty]')?.textContent.includes('sent yet'));
        check(w,'empty Everything says no sends',(await sec.textContent()).includes('No email has been sent yet.'));
        setMode('hold');await sec.getByRole('button',{name:'Problems',exact:true}).click();await page.waitForSelector('.bo-mail [data-mail-state=loading]');
        check(w,'loading marked busy',await sec.getAttribute('aria-busy')==='true');
        setMode('normal');await sec.getByRole('button',{name:'Everything',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.bo-mail [data-mail-id]').length===7);
        await held().fulfill({json:{rows:ROWS.filter(r=>bad.includes(r.status))}});await page.waitForTimeout(150);
        check(w,'late Problems answer cannot replace Everything',await sec.locator('[data-mail-id]').count()===7&&await sec.getByRole('button',{name:'Everything',exact:true}).getAttribute('aria-pressed')==='true');
        check(w,'all API actions are read-only',sent.every(b=>['whoami','list','email_list'].includes(b.action)));
        check(w,'console has only one planned HTTP refusal',noise.length===1&&noise[0].includes('400'),JSON.stringify(noise));
        observed[w]={rows:7,requests:sent.length,console:noise};completed++;
      }catch(e){failures.push(`${w}: ${e.message}`);}finally{await context.close();}
    }
  }
}finally{await browser.close();}
if(FREEZE)process.exit(0);
const status=failures.length===0&&completed===6&&canary.observed_failure?'pass':'fail';
const {path}=writeReceipt({check_id:`office-mail${LITE?'-lite':''}`,started_at,status,expected_targets:6,discovered_targets:discovered,attempted_targets:6,completed_targets:completed,skipped_targets:0,assertions_executed:assertions,min_assertions:156,assertion_floor:'Six declared widths × 26 questions, fixed before running. A missing section cannot execute the dependent questions.',failures,artifacts,canary,warnings:['Synthetic session and intercepted server answers; no live email or database writes. The browser proves the view and request contract, not deployed server behavior.'],dimensions:{sizes:SIZES,lite:LITE,...(BREAK?{break:BREAK}:{}),observed}});
console.log(status,assertions,failures,path);process.exit(status==='pass'?0:1);
