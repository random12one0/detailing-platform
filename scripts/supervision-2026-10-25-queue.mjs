// Reproduce the supervision's queue finding using the installed belt's real parser.
// Read-only, no credentials or model calls. Compares the pre-supervision roadmap
// at 4c9b8555 with the current working copy; prints only readiness and blockers.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseItems,analyse} from '../../belt/lib.mjs';
const config=JSON.parse(readFileSync(new URL('../../belt/belt.config.json',import.meta.url),'utf8'));
const before=execFileSync('git',['show','4c9b8555:ROADMAP.md'],{encoding:'utf8',maxBuffer:16*1024*1024});
const current=readFileSync('ROADMAP.md','utf8');
for(const [source,text] of [['4c9b8555',before],['working copy',current]]){
 const items=parseItems(text),ctx={...config,openIds:new Set(items.map(i=>i.id))};
 for(const id of ['97.63','3.4g','97.55']){
  const item=items.find(i=>i.id===id);if(!item)throw Error(`Missing ${id}`);
  const a=analyse(item,ctx);console.log(JSON.stringify({source,id,ready:a.ready,dependencies:a.deps,blockers:a.blockedByPhrase}));
 }
}
