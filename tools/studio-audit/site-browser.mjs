import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { conversion } from './site-conversion.mjs';
import { contractGate } from './site-score.mjs';
// Reuse the existing app's Playwright, without downloading a second browser.
// The platform sits beside this file's folder, whatever the current directory is.
export const PLATFORM = path.resolve(process.env.SITE_ACCEPTANCE_PLATFORM || path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
const app = createRequire(path.join(PLATFORM,'app/package.json'));
export const chromium = app('playwright').chromium;
const axe = app.resolve('axe-core/axe.min.js');
const gate = (measures,failures) => ({pass:!failures.length,measures,failures});
// The ONE stamp checker (Studio review S2-5). Its renderer helpers come from the platform copy, which has them only
// once the Studio's renderer is in it, so they are loaded only when a Studio site is graded.
import * as STAMPS from './site-stamps.mjs';
let checker;
async function studioChecker() {
  if (checker !== undefined) return checker;
  try {
    const load = (f) => import(pathToFileURL(path.join(PLATFORM, f)).href);
    const [spec, core, fmt] = await Promise.all([load('app/src/site/spec.js'), load('app/src/book/core.js'), load('app/src/lib/format.js')]);
    checker = STAMPS.stampChecker({ parseBinding: spec.parseBinding, resolve: spec.resolve, vehicleSizeExtra: core.vehicleSizeExtra, money: fmt.money, duration: fmt.duration, time12: fmt.time12 });
    checker.validateSpec = spec.validateSpec;   // G0 judges a Studio spec's wording against the dashboard (review F1)
  } catch { checker = null; }
  return checker;
}

export function geometry() {
  const failures=[], vw=innerWidth, fail=(e,detail)=>failures.push({selector:e.id?`#${CSS.escape(e.id)}`:e.tagName.toLowerCase(),detail});
  const visible=e=> {const r=e.getBoundingClientRect();for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.02||n.hidden)return false;}return r.width>0&&r.height>0;};
  // Studio S6, after review: NO SUBTREE IS EXEMPT. Three narrow rules, each for one intended design, with tests that a
  // real defect next to them still fails (site-browser.test.mjs):
  // 1. A control's TARGET includes an absolutely positioned ::after that enlarges it. (The booking flow's 28 px
  //    "What's included" band reaches 44 px that way: Andrew's 2026-09-19 ruling. The paint may be small, the target not.)
  // 2. Inside one [data-stack], a PICTURE (an img, or the before/after slider over its pictures) may sit under or over
  //    something else of that stack: words over a hero photo, the two layers of a before/after. Words with words,
  //    controls with controls, control spacing, and anything against the rest of the page are still checked.
  // 3. Two named pairs tile on purpose, inside the same parent: the booking flow's two language chips (6 px apart) and
  //    a service card's pick / "What's included" controls (their targets meet exactly). Nothing else.
  // A pair where one part is pinned (position sticky or fixed) and the other is not in that same pinned part is judged
  // by covered() instead, where the pinned part really shows: at scroll 0 a bar that sticks to the bottom of the screen
  // waits at the top of its section, over content no visitor sees it cover.
  const pinned=e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const p=getComputedStyle(n).position;if(p==='sticky'||p==='fixed')return n;}return null;};
  const stackOf=e=>e.closest('[data-stack]'),pic=e=>e.matches('img,input[type="range"]');
  const PAIRS=[['.bk-lang .bk-chip','.bk-lang .bk-chip'],['.bk-svc .bk-pick','.bk-svc .bk-peek']];
  const pairOk=(a,b)=>PAIRS.some(([p,q])=>((a.matches(p)&&b.matches(q))||(a.matches(q)&&b.matches(p)))&&a.closest('.bk-lang,.bk-svc')===b.closest('.bk-lang,.bk-svc'));
  const target=e=>{const r=e.getBoundingClientRect(),a=getComputedStyle(e,'::after'),px=v=>(v==='auto'?null:parseFloat(v));let t=r.top,b=r.bottom,l=r.left,rt=r.right;
    if(a.content&&a.content!=='none'&&a.position==='absolute'){if(px(a.top)!==null)t=Math.min(t,r.top+px(a.top));if(px(a.bottom)!==null)b=Math.max(b,r.bottom-px(a.bottom));if(px(a.left)!==null)l=Math.min(l,r.left+px(a.left));if(px(a.right)!==null)rt=Math.max(rt,r.right-px(a.right));}
    return {w:rt-l,h:b-t};};
  const all=[...document.body.querySelectorAll('*')].filter(visible),controls=all.filter(e=>e.matches('a,button,input,select,textarea,[role="button"]'));
  for(const e of all) {
    if(e.closest('svg,pre,code,textarea')||e.matches('script,style,option'))continue;
    const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    if(r.left<-.5||r.right>vw+.5)fail(e,'Horizontal overflow');
    if(e.clientWidth>0&&e.scrollWidth>e.clientWidth+1&&!['auto','scroll'].includes(s.overflowX))fail(e,'Clipped horizontal content');
    if(e.clientHeight>0&&e.scrollHeight>e.clientHeight+1&&['hidden','clip'].includes(s.overflowY))fail(e,'Clipped vertical content');
    if(vw<=390&&controls.includes(e)){const t=target(e);if(t.w<44||t.h<44)fail(e,'Phone target below 44px');}
  }
  const leaves=all.filter(e=>e.matches('h1,h2,h3,p,img,button,input,select,textarea,a')&&!e.querySelector('h1,h2,h3,p,img,button,input,select,textarea,a'));
  for(let i=0;i<leaves.length;i++)for(const b of leaves.slice(i+1)) {
    const a=leaves[i];if(a.contains(b)||b.contains(a))continue;
    if(pinned(a)!==pinned(b)||pairOk(a,b))continue;
    const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
    const ox=Math.min(x.right,y.right)-Math.max(x.left,y.left),oy=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);
    if(ox>1&&oy>1&&!(stackOf(a)&&stackOf(a)===stackOf(b)&&(pic(a)||pic(b))))fail(a,`Overlaps ${b.id||b.tagName}`);
    if(controls.includes(a)&&controls.includes(b)) {
      const dx=Math.max(0,x.left-y.right,y.left-x.right),dy=Math.max(0,x.top-y.bottom,y.top-x.bottom);
      if((ox>0||oy>0)&&Math.hypot(dx,dy)<8)fail(a,'Controls separated by less than 8px');
    }
  }
  return {failures,targets:all.length,visible:all.filter(e=>e.matches('h1,h2,h3,p,img,[data-section]')).map(e=>({id:e.id,tag:e.tagName,text:e.textContent.slice(0,100)}))};
}
// Nothing is hidden under a pinned part where it rests (review F5): every word, picture and control, scrolled to the
// middle of the screen, must be what is drawn at its centre, not a sticky or fixed bar or panel over it. (Content that
// passes under a top or bottom bar while scrolling is how such a bar works; content it covers at rest is a defect.)
export function covered() {
  const out=[],y0=scrollY,leafSel='h1,h2,h3,p,img,button,a,input,select,textarea';
  const shown=e=>{for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.02)return false;}return true;};
  const pins=[...document.body.querySelectorAll('*')].filter(e=>['sticky','fixed'].includes(getComputedStyle(e).position));
  if(!pins.length)return out;
  const leaves=[...document.body.querySelectorAll(leafSel)].filter(e=>!e.querySelector(leafSel)&&!pins.some(p=>p.contains(e))&&shown(e));
  for(const e of leaves){
    const r=e.getBoundingClientRect();if(!r.width||!r.height||r.height>innerHeight*.6)continue;
    window.scrollTo({top:scrollY+r.top+r.height/2-innerHeight/2,behavior:'instant'});
    const q=e.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2;
    if(x<0||x>=innerWidth||y<0||y>=innerHeight)continue;   // cannot be scrolled into view (a skip link waiting above the page)
    const hit=document.elementFromPoint(x,y),p=hit&&pins.find(p=>p.contains(hit)&&!p.contains(e));
    if(p)out.push({selector:e.id?'#'+e.id:e.tagName.toLowerCase(),detail:'Covered by a pinned part ('+(p.className||p.tagName)+') in the middle of the screen'});
  }
  window.scrollTo({top:y0,behavior:'instant'});return out;
}
function motion() {
  const failures=[], fail=(selector,detail)=>failures.push({selector,detail});
  const allowed=['transform','opacity','clip-path'];
  const visit=rules=>{for(const rule of rules){
    if(rule.type===CSSRule.KEYFRAMES_RULE) {for(const frame of rule.cssRules)for(const prop of frame.style)
      if(!allowed.includes(prop))fail(rule.name,`Forbidden animated property: ${prop}`);}
    else if(rule.cssRules)visit(rule.cssRules);
    if(rule.style){const props=rule.style.transitionProperty.split(',').map(v=>v.trim());
      if(rule.style.transitionDuration&&props.some(p=>p&&p!=='none'&&!allowed.includes(p)))fail(rule.selectorText||'style','Unsafe transition property');}
  }};
  for(const sheet of document.styleSheets){try{visit(sheet.cssRules);}catch{fail('link[rel="stylesheet"]','Uninspectable stylesheet');}}
  for(const e of document.querySelectorAll('[style]'))if(e.style.transitionProperty==='all'||/transition\s*:\s*all/.test(e.getAttribute('style')))fail('[style]','transition-all');
  for(const a of document.getAnimations())for(const frame of a.effect?.getKeyframes()||[])for(const key of Object.keys(frame))
    if(!['offset','easing','composite','computedOffset',...allowed,'clipPath'].includes(key))fail('animation',`Forbidden animation property: ${key}`);
  return {failures,running:document.getAnimations().filter(a=>a.playState==='running').length};
}
async function keyboard(page) {
  const failures=await page.evaluate(()=>{
    const out=[],fail=(selector,detail)=>out.push({selector,detail});
    if(document.querySelectorAll('h1').length!==1)fail('h1','Exactly one h1 required');
    for(const s of ['main','nav'])if(!document.querySelector(s))fail(s,'Missing landmark');
    if(![...document.querySelectorAll('a[href^="#"]')].some(e=>/skip/i.test(e.textContent)&&document.getElementById(e.hash.slice(1))))fail('a[href^="#"]','Missing skip link');
    for(const e of document.querySelectorAll('[tabindex]'))if(e.tabIndex>0)fail('[tabindex]','Positive tabindex');
    return out;
  });
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  // Each control gets a fixed index before tabbing, so focus styles or aria changes cannot hide a match.
  const count=await page.evaluate(()=>{const all=document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,[tabindex="0"]');all.forEach((e,i)=>e.dataset.kbd=i);return all.length;});
  const visited=new Set();let first=null;
  // No fixed cap: stop when focus wraps back to the first control (or after every control plus a few page stops).
  for(let i=0;i<=count+5;i++) {
    await page.keyboard.press('Tab');
    const f=await page.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return {key:e.dataset?.kbd??null,label:e.id?'#'+e.id:e.outerHTML.slice(0,160),tag:e.tagName,visible:s.visibility!=='hidden'&&Number(s.opacity)>0,ring:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0||s.boxShadow!=='none'};});
    if(f.tag==='BODY')continue;
    if(f.key!=null&&f.key===first)break;first??=f.key;if(f.key!=null)visited.add(f.key);
    if(!f.visible||!f.ring)failures.push({selector:f.label,detail:'Keyboard focus must be visible'});
  }
  if(!visited.size)failures.push({selector:'body',detail:'No keyboard targets'});
  const unreachable=await page.evaluate(keys=>[...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea')].filter(e=>{
    const r=e.getBoundingClientRect();return !e.disabled&&r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&!keys.includes(e.dataset.kbd);
  }).map(e=>e.id?'#'+e.id:e.tagName.toLowerCase()),[...visited]);
  // Leave no focus behind: a focused skip link shifts the layout under the next check's taps.
  await page.evaluate(()=>{document.querySelectorAll('[data-kbd]').forEach(e=>delete e.dataset.kbd);document.activeElement?.blur();});
  unreachable.forEach(selector=>failures.push({selector,detail:'Control unreachable by keyboard'}));
  return gate({targets:count,visited:visited.size},failures);
}
// `spec` (Studio S6): a Studio revision or direction to draw on the renderer's /site/preview, handed in before the page
// runs (the same door the connection check uses). Without it the page at `url` is graded as it stands.
export async function browserGates(url,{out,profile=null,spec=null}={}) {
  if(!out)throw Error('Screenshot output directory required');mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const results={G1:gate({screenshots:[],viewports:[]},[]),G2:gate({viewports:[]},[]),G3:gate({viewports:[]},[]),G5:gate({viewports:[]},[])};
  try {
    for(const [width,height] of [[1440,900],[768,1024],[390,844]]) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'}),page=await context.newPage(),consoleFailures=[];
      page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleFailures.push({selector:'console',detail:m.text()});});
      page.on('pageerror',e=>consoleFailures.push({selector:'console',detail:e.message}));
      if(spec)await page.addInitScript(s=>{window.__STUDIO_SPEC__=s;},spec);
      await page.addInitScript(()=>{window.__scrollHijacks=0;const p=Event.prototype.preventDefault;Event.prototype.preventDefault=function(){if(['wheel','touchmove'].includes(this.type))window.__scrollHijacks++;return p.call(this);};});
      try {
        const response=await page.goto(url,{waitUntil:'networkidle'});if(!response?.ok())throw Error(`HTTP ${response?.status()}`);
        await page.evaluate(()=>document.fonts.ready);
        if(!results.G0){const contract=await page.evaluate(()=>document.querySelector('#site-contract')?.textContent);try{
          const c=contract?JSON.parse(contract):null;
          // Unbound digits and missing sections, read in the page; every binding is judged in node by the ONE shared
          // stamp checker (site-stamps.mjs), the same the Studio's connection check uses.
          const seen=await page.evaluate((c)=>{
            const failures=[],fail=(selector,detail)=>failures.push({selector,detail});
            for(const el of document.querySelectorAll('body *'))if(!el.closest('[data-from],script,style,svg')&&
              [...el.childNodes].some(n=>n.nodeType===3&&/\d/.test(n.textContent)))fail(el.id?'#'+el.id:el.tagName,'Unbound digits in prose');
            for(const s of c?.required||[])if(!document.querySelector(`[data-section="${CSS.escape(s)}"]`))fail('[data-section]','Missing rendered contract section: '+s);
            const figures=(c?.bindings||[]).map(b=>{const el=document.querySelector(b.selector);return {selector:b.selector,from:b.from,found:!!el,stamp:el?.dataset.from??null,text:el?el.textContent.replace(/\s+/g,' ').trim():''};});
            return {failures,figures};
          },c);seen.stamps=await page.evaluate(STAMPS.readStamps);
          if(c){
            results.G0=contractGate(c);results.G0.failures.push(...seen.failures);
            for(const f of seen.figures)if(!f.found||f.stamp!==f.from||!STAMPS.figureShows(f.text,c.sources?.[f.from]))results.G0.failures.push({selector:f.selector,detail:'Figure is not bound to its declared source'});
          } else if(seen.stamps.length){
            // A Studio site: no contract block; its stamps are judged against the detailer's profile.
            const failures=[...seen.failures],check=profile&&await studioChecker();
            if(!profile)failures.push({selector:'[data-from]',detail:'A Studio site needs the profile it was drawn from to check its stamps'});
            else if(!check)failures.push({selector:'[data-from]',detail:`The platform at ${PLATFORM} has no site renderer to check stamps with`});
            else for(const st of seen.stamps){const why=check.stampProblem(st,profile);if(why)failures.push({selector:`[data-from="${st.from}"]`,detail:why});}
            // the wording itself: a claim only the dashboard can make, or work / a way of working it does not have
            if(profile&&check&&spec&&check.validateSpec)for(const e of check.validateSpec(spec,profile).errors)failures.push({selector:e.path,detail:e.message});
            results.G0=gate({stamps:seen.stamps.length,connections:new Set(seen.stamps.map(x=>x.from)).size},failures);
          } else {results.G0=contractGate(null);results.G0.failures.push(...seen.failures);}
          results.G0.pass=!results.G0.failures.length;
        }catch(e){results.G0=gate({},[{selector:'#site-contract',detail:e.message}]);}}
        const measured=await page.evaluate(geometry),normalMotion=await page.evaluate(motion),underPins=await page.evaluate(covered);
        // THE EVIDENCE (review F5): unmodified screenshots of the screen as a visitor sees it. Phone: the first screen, the
        // second (the rubric asks what shows within two screens), the reviews, the booking form. Tablet: the top. Desktop:
        // the top and the booking form. These go to the critic.
        const views=[];
        for(const [name,where] of (width<=390?[['top',0],['second',1],['reviews','[data-part="reviews"]'],['booking','book']]:width<1100?[['top',0]]:[['top',0],['booking','book']])) {
          await page.evaluate(([w])=>{const b=document.querySelector('[data-from="book"][data-part="flow"]')?.closest('section');
            const at=typeof w==='string'&&w!=='book'?document.querySelector(w):null;
            const y=w==='book'?(b?b.getBoundingClientRect().top+scrollY-8:0):at?at.getBoundingClientRect().top+scrollY-80:typeof w==='number'?w*innerHeight:0;window.scrollTo({top:y,behavior:'instant'});},[where]);
          await page.waitForTimeout(150);
          const f=path.resolve(out,`${width}x${height}-${name}.png`);await page.screenshot({path:f});views.push(f);
        }
        await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
        // A SUPPLEMENTARY full-page picture (the Studio's phone frame scrolls it). Its one change: the booking form's own
        // bottom bar, the one part that sticks to the bottom of the screen, is drawn where it ends the form, not at the
        // top of the form where a page captured at scroll 0 would leave it. Every measure above is taken first.
        const stuck=await page.evaluate(()=>{const b=document.querySelector('[data-from="book"][data-part="flow"] .bk-bar');if(!b||getComputedStyle(b).position!=='sticky')return 0;b.dataset.unstuck=b.style.position||'-';b.style.position='relative';return 1;});
        const screenshot=path.resolve(out,`${width}x${height}.png`);await page.screenshot({path:screenshot,fullPage:true});
        if(stuck)await page.evaluate(()=>{for(const e of document.querySelectorAll('[data-unstuck]')){e.style.position=e.dataset.unstuck==='-'?'':e.dataset.unstuck;delete e.dataset.unstuck;}});
        results.G1.measures.screenshots.push(screenshot);(results.G1.measures.views||=[]).push(...views);results.G1.measures.viewports.push({width,height,targets:measured.targets});
        results.G1.failures.push(...measured.failures,...underPins);
        await page.addScriptTag({path:axe});
        const accessibility=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
        const keys=await keyboard(page);
        results.G2.measures.viewports.push({width,violations:accessibility.violations.length,keyboard:keys.measures});
        results.G2.failures.push(...keys.failures,...accessibility.violations.filter(v=>['serious','critical'].includes(v.impact)).flatMap(v=>v.nodes.map(n=>({selector:n.target.join(' '),detail:v.id}))));
        await page.evaluate(()=>window.scrollTo(0,0));
        try{const c=await conversion(page);results.G3.measures.viewports.push({width,...c.measures});results.G3.failures.push(...c.failures);}
        catch(e){results.G3.failures.push({selector:'[data-book]',detail:e.message});}
        await page.goto(url,{waitUntil:'networkidle'});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(80);
        const reduced=await page.evaluate(motion),hidden=await page.evaluate(original=>original.filter(x=>{
          const candidates=x.id?[document.getElementById(x.id)]:[...document.getElementsByTagName(x.tag)].filter(e=>e.textContent.slice(0,100)===x.text);
          return !candidates.some(e=>{if(!e)return false;const r=e.getBoundingClientRect();for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.02)return false;}return r.width>0&&r.height>0;});
        }),measured.visible);
        results.G5.measures.viewports.push({width,running:reduced.running,hidden:hidden.length});
        results.G5.failures.push(...normalMotion.failures,...reduced.failures,...hidden.map(x=>({selector:x.id?'#'+x.id:x.tag,detail:'Content hidden under reduced motion'})));
        if(reduced.running)results.G5.failures.push({selector:'animation',detail:'Animations running under reduced motion'});
        await page.mouse.wheel(0,400);
        await page.waitForTimeout(40);
        if(await page.evaluate(()=>window.__scrollHijacks))results.G5.failures.push({selector:'body',detail:'Scroll hijacking'});
        results.G1.failures.push(...consoleFailures);
      } finally { await context.close(); }
    }
    for(const g of Object.values(results))g.pass=!g.failures.length;
    writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2)+'\n');return results;
  } finally {await browser.close();}
}
