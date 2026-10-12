// 9.12a 6c: the new list against the actual deployed action. Demo owner login
// only, programmatically from .env; credentials and mail content never logged.
// No row creation, no email sends, no business changes. Auth creates a session.
import '../tests/_env.mjs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { demoOwner } from './lib/demoOwner.mjs';
import { writeReceipt } from './receipt.mjs';
const {chromium}=createRequire(import.meta.url)('../app/node_modules/playwright/index.js');
const BASE=process.env.BASE||'http://127.0.0.1:5182';
if(new URL(process.env.SUPABASE_URL).hostname!=='kguqylyzgyzfktkfnhjb.supabase.co')throw Error('Wrong platform project');
const started_at=new Date().toISOString(),sizes=[[392,844],[1440,900]],failures=[],observed={};
let assertions=0,completed=0,discovered=0;
const canary={id:'real-row-subject-altered-in-browser',observed_failure:false};
const check=(w,name,yes)=>{assertions++;if(!yes)failures.push(`${w}: ${name}`);console.log(`${yes?'ok':'FAIL'} ${w} ${name}`);};
const matches=(wire,drawn)=>JSON.stringify(wire.map(r=>[r.id,r.subject]))===JSON.stringify(drawn);
const browser=await chromium.launch();
try {
  for(const [w,h] of sizes){const ctx=await browser.newContext({viewport:{width:w,height:h}}),page=await ctx.newPage();
    const noise=[],responses=[];page.on('console',m=>{if(['warning','error'].includes(m.type()))noise.push(m.text());});page.on('pageerror',e=>noise.push(e.message));
    page.on('response',async r=>{if(r.url().endsWith('/functions/v1/platform-admin')&&r.request().postDataJSON()?.action==='email_list')responses.push({status:r.status(),body:await r.json()});});
    try {
      const owner=demoOwner();await page.goto(`${BASE}/admin`);await page.waitForSelector('input[type=email]');
      await page.fill('input[type=email]',owner.email);await page.fill('input[type=password]',owner.password);await page.click('form button.pa-btn');await page.waitForSelector('.pa-top');
      await page.goto(`${BASE}/admin/office#system`);await page.waitForSelector('.bo-mail');discovered++;
      await page.waitForFunction(()=>document.querySelector('.bo-mail')?.getAttribute('aria-busy')==='false');
      await page.locator('.bo-mail summary').click(); // 9.12d: the section arrives folded
      await page.waitForTimeout(500);
      const wire=responses[0],sec=page.locator('.bo-mail');
      check(w,'live email_list answers 200 with a nonempty list',wire?.status===200&&Array.isArray(wire.body?.rows)&&wire.body.rows.length>0);
      const drawn=()=>sec.locator('[data-mail-id]').evaluateAll(es=>es.map(e=>[e.dataset.mailId,e.querySelector('.bo-mail-subject').textContent]));
      check(w,'new view shows every real row in server order',Array.isArray(wire?.body?.rows)&&matches(wire.body.rows,await drawn()));
      if(w===392&&wire?.body?.rows?.length){await sec.locator('.bo-mail-subject').first().evaluate(e=>e.textContent='Canary changed subject');canary.observed_failure=!matches(wire.body.rows,await drawn());}
      await page.route('**/functions/v1/platform-admin',r=>r.request().postDataJSON().action==='email_list'?r.fulfill({status:400,json:{error:'This read was refused for the browser check.'}}):r.continue());
      await sec.getByRole('button',{name:'Problems',exact:true}).click();await page.waitForSelector('.bo-mail [data-mail-state=failed]');
      check(w,'planned refused read shows its sentence',await sec.getByRole('alert').textContent().then(t=>t.includes('This read was refused for the browser check.')));
      check(w,'refusal shows no empty sentence or old rows',await sec.locator('[data-mail-state=empty], [data-mail-id]').count()===0);
      check(w,'console contains only the planned 400',noise.length===1&&noise[0].includes('400'));
      observed[w]={http:wire?.status,rows:wire?.body?.rows?.length,console:noise};completed++;
    }catch(e){failures.push(`${w}: ${e.message}`);}finally{await ctx.close();}
  }
}finally{await browser.close();}
const status=failures.length===0&&completed===2&&canary.observed_failure?'pass':'fail';
mkdirSync('artifacts/office-mail-live',{recursive:true});
writeFileSync('artifacts/office-mail-live/result.json',JSON.stringify({started_at,status,observed,canary,failures},null,2));
const {path}=writeReceipt({check_id:'office-mail-live',started_at,status,expected_targets:2,discovered_targets:discovered,attempted_targets:2,completed_targets:completed,skipped_targets:0,assertions_executed:assertions,min_assertions:10,assertion_floor:'Two declared widths × five questions: real success, contents/order, refusal sentence, no false empty, console.',failures,artifacts:['artifacts/office-mail-live/result.json'],canary,warnings:['Signs in as the existing demo owner. Reads mail; sends none. The refusal is intercepted in the browser. Mail contents and credentials are never printed or saved.'],dimensions:{sizes,project:'kguqylyzgyzfktkfnhjb',observed}});
console.log(status,assertions,failures,path);process.exit(status==='pass'?0:1);
