import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { rubric } from './site-score.mjs';
import { runProcess } from './site-critic.mjs';
const require = createRequire(import.meta.url);
const median = a => [...a].sort((x,y)=>x-y)[1];
async function localRunner({url,out,run}) {
  // Resolve locally only. Never npx, download a browser, or fall back to a global CLI.
  const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url))),pin=pkg.devDependencies.lighthouse;
  let cli,installed;
  try { cli=require.resolve('lighthouse/cli/index.js');installed=require('lighthouse/package.json').version; }
  catch { throw Error(`Pinned local Lighthouse ${pin} is absent; no installation was attempted`); }
  if(installed!==pin)throw Error(`Expected local Lighthouse ${pin}, found ${installed}`);
  const file=path.resolve(out,`lighthouse-${run}.json`);
  await runProcess(process.execPath,[cli,url,'--form-factor=mobile','--throttling-method=simulate',
    '--only-categories=performance,accessibility,best-practices,seo','--output=json',`--output-path=${file}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu','--no-enable-error-reporting','--quiet']);
  const lhr=JSON.parse(readFileSync(file,'utf8'));
  const {chromium}=await import('./site-browser.mjs'),browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(url,{waitUntil:'networkidle'});
    lhr.siteAssets=await page.evaluate(()=>{
      const fonts=new Set(),weights=new Set();
      for(const el of document.querySelectorAll('body *'))if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&el.getBoundingClientRect().width){
        const s=getComputedStyle(el),family=s.fontFamily.split(',')[0].trim();fonts.add(family);weights.add(`${family}:${s.fontWeight}`);
      }
      return {fontFamilies:fonts.size,fontWeights:weights.size,heroUrl:document.querySelector('[data-hero],img[fetchpriority="high"],main img')?.currentSrc||null};
    });
  } finally {await browser.close();}
  let gzipJs=0;
  const scripts=new Set((lhr.audits?.['network-requests']?.details?.items||[]).filter(r=>r.resourceType==='Script').map(r=>r.url));
  for(const src of scripts){const res=await fetch(src,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(`Cannot measure JS ${src}`);gzipJs+=gzipSync(Buffer.from(await res.arrayBuffer())).length;}
  lhr.siteAssets.gzipJs=gzipJs;return lhr;
}
export async function lighthouseGate(url,{out,runner=localRunner}={}) {
  if(!out)throw Error('Lighthouse output directory required');mkdirSync(out,{recursive:true});
  const runs=[],failures=[],fail=(selector,detail)=>failures.push({selector,detail});
  try {
    for(let run=1;run<=3;run++) {
      const lhr=await runner({url,out,run});
      writeFileSync(path.join(out,`lighthouse-${run}.json`),JSON.stringify(lhr)+'\n');
      if(lhr.runtimeError)throw Error(`Lighthouse runtime error: ${lhr.runtimeError.message}`);
      const a=lhr.audits,c=lhr.categories,requests=a?.['network-requests']?.details?.items;
      if(!Array.isArray(requests))throw Error('Missing Lighthouse network evidence');
      const assets=lhr.siteAssets, scripts=requests.filter(r=>r.resourceType==='Script');
      // A named hero that Lighthouse never fetched is unknown, and unknown fails (never size 0).
      const heroes=requests.filter(r=>assets?.heroUrl?r.url===assets.heroUrl:r.resourceType==='Image');
      if(assets?.heroUrl&&!heroes.length)throw Error(`Hero image not found in the Lighthouse network log: ${assets.heroUrl}`);
      const row={performance:c?.performance?.score*100,accessibility:c?.accessibility?.score*100,
        bestPractices:c?.['best-practices']?.score*100,seo:c?.seo?.score*100,
        lcp:a?.['largest-contentful-paint']?.numericValue,cls:a?.['cumulative-layout-shift']?.numericValue,tbt:a?.['total-blocking-time']?.numericValue,
        transfer:a?.['total-byte-weight']?.numericValue,
        gzipJs:assets?.gzipJs??(scripts.length?NaN:0),fontFamilies:assets?.fontFamilies??(requests.some(r=>r.resourceType==='Font')?NaN:0),
        fontWeights:assets?.fontWeights??(requests.some(r=>r.resourceType==='Font')?NaN:0),
        hero:Math.max(0,...heroes.map(r=>r.resourceSize??r.transferSize))};
      if(Object.values(row).some(v=>!Number.isFinite(v)||v<0))throw Error('Missing/nonfinite Lighthouse or asset measures');
      runs.push(row);
    }
  } catch(e){fail('lighthouse',e.message);}
  const assets=['gzipJs','transfer','hero','fontFamilies','fontWeights'];
  const measures=runs.length===3?Object.fromEntries(Object.keys(runs[0]).map(k=>[k,assets.includes(k)?Math.max(...runs.map(r=>r[k])):median(runs.map(r=>r[k]))])):{};
  if(runs.length!==3)fail('lighthouse','Three completed mobile runs required');
  for(const [key,floor] of Object.entries(rubric.floors))if(!(measures[key]>=floor))fail(key,`${key} below ${floor}`);
  for(const [key,ceiling] of Object.entries(rubric.ceilings))if(!(measures[key]<=ceiling))fail(key,`${key} exceeds ${ceiling}`);
  const result={pass:!failures.length,measures,runs,failures};
  writeFileSync(path.join(out,'performance.json'),JSON.stringify(result,null,2)+'\n');return result;
}
